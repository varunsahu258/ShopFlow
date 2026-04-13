// ─────────────────────────────────────────────────────────────────────────────
//  ShopFlow  —  Declarative Jenkins Pipeline
//
//  Stages:
//    1. Checkout
//    2. Install & Lint
//    3. Unit Tests
//    4. Docker Build
//    5. Docker Push
//    6. Selenium UI Tests (against ephemeral compose stack)
//    7. Ansible Provision
//    8. Kubernetes Deploy
//    9. Smoke Test
//   10. Notify
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    environment {
        // Docker Hub credentials (configure in Jenkins → Manage Credentials)
        DOCKER_REGISTRY  = 'docker.io'
        DOCKER_NAMESPACE = 'yourorg'
        IMAGE_BACKEND    = "${DOCKER_NAMESPACE}/shopflow-backend"
        IMAGE_FRONTEND   = "${DOCKER_NAMESPACE}/shopflow-frontend"
        IMAGE_TAG        = "${env.GIT_COMMIT?.take(8) ?: 'latest'}"

        // Kubernetes
        K8S_NAMESPACE    = 'shopflow'
        KUBECONFIG       = credentials('kubeconfig')

        // Slack / notification webhook (optional)
        SLACK_CHANNEL    = '#deployments'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        // ── 1 · Checkout ────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                echo "Building commit: ${env.GIT_COMMIT}"
                sh 'git log -1 --format="%h %s by %an"'
            }
        }

        // ── 2 · Lint & Install ──────────────────────────────────────────────
        stage('Lint & Install') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npm run lint --if-present || true'
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run lint --if-present || true'
                        }
                    }
                }
            }
        }

        // ── 3 · Unit Tests ──────────────────────────────────────────────────
        stage('Unit Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            sh 'npm test -- --forceExit'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'backend/junit.xml'
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh 'npm test -- --watchAll=false --ci'
                        }
                    }
                }
            }
        }

        // ── 4 · Docker Build ────────────────────────────────────────────────
        stage('Docker Build') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        sh """
                            docker build \
                              --tag ${IMAGE_BACKEND}:${IMAGE_TAG} \
                              --tag ${IMAGE_BACKEND}:latest \
                              --cache-from ${IMAGE_BACKEND}:latest \
                              ./backend
                        """
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        sh """
                            docker build \
                              --tag ${IMAGE_FRONTEND}:${IMAGE_TAG} \
                              --tag ${IMAGE_FRONTEND}:latest \
                              --cache-from ${IMAGE_FRONTEND}:latest \
                              --build-arg REACT_APP_API_URL=https://api.shopflow.example.com/api \
                              ./frontend
                        """
                    }
                }
            }
        }

        // ── 5 · Selenium UI Tests (ephemeral stack) ─────────────────────────
        stage('Selenium UI Tests') {
            environment {
                SELENIUM_BASE_URL = 'http://localhost:3000'
            }
            steps {
                sh '''
                    # Spin up full stack for UI testing
                    docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d --wait
                    sleep 10

                    # Run Selenium tests
                    cd tests/selenium
                    pip install -r requirements.txt -q
                    python -m pytest . -v \
                        --html=selenium-report.html \
                        --self-contained-html \
                        --junitxml=selenium-junit.xml \
                        || true
                '''
            }
            post {
                always {
                    sh 'docker compose down -v || true'
                    junit allowEmptyResults: true, testResults: 'tests/selenium/selenium-junit.xml'
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'tests/selenium',
                        reportFiles: 'selenium-report.html',
                        reportName: 'Selenium Report'
                    ])
                }
            }
        }

        // ── 6 · Docker Push ─────────────────────────────────────────────────
        stage('Docker Push') {
            when { branch pattern: 'main|release/.*', comparator: 'REGEXP' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                        docker push ${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${IMAGE_BACKEND}:latest
                        docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${IMAGE_FRONTEND}:latest
                        docker logout
                    """
                }
            }
        }

        // ── 7 · Ansible Provision ───────────────────────────────────────────
        stage('Ansible Provision') {
            when { branch 'main' }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'ansible-ssh-key',
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh """
                        cd ansible
                        ansible-playbook \
                          -i inventory/production.ini \
                          --private-key \$SSH_KEY \
                          playbooks/provision.yml \
                          -e "image_tag=${IMAGE_TAG}" \
                          --diff
                    """
                }
            }
        }

        // ── 8 · Kubernetes Deploy ───────────────────────────────────────────
        stage('Kubernetes Deploy') {
            when { branch 'main' }
            steps {
                sh """
                    export KUBECONFIG=\$KUBECONFIG

                    # Create namespace if missing
                    kubectl get namespace ${K8S_NAMESPACE} || \
                      kubectl create namespace ${K8S_NAMESPACE}

                    # Apply secrets & configmaps first
                    kubectl apply -f k8s/base/secrets.yml       -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/base/configmap.yml     -n ${K8S_NAMESPACE}

                    # Roll out all services
                    kubectl apply -f k8s/base/postgres.yml      -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/base/backend.yml       -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/base/frontend.yml      -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/base/ingress.yml       -n ${K8S_NAMESPACE}

                    # Update image tags (rolling deploy)
                    kubectl set image deployment/backend  \
                        backend=${IMAGE_BACKEND}:${IMAGE_TAG}  \
                        -n ${K8S_NAMESPACE}
                    kubectl set image deployment/frontend \
                        frontend=${IMAGE_FRONTEND}:${IMAGE_TAG} \
                        -n ${K8S_NAMESPACE}

                    # Wait for rollout
                    kubectl rollout status deployment/backend  -n ${K8S_NAMESPACE} --timeout=5m
                    kubectl rollout status deployment/frontend -n ${K8S_NAMESPACE} --timeout=5m
                """
            }
        }

        // ── 9 · Smoke Test ──────────────────────────────────────────────────
        stage('Smoke Test') {
            when { branch 'main' }
            steps {
                sh '''
                    bash scripts/smoke-test.sh
                '''
            }
        }
    }

    // ── Post actions ──────────────────────────────────────────────────────────
    post {
        success {
            echo "✅  Build ${env.BUILD_NUMBER} deployed successfully."
            // slackSend channel: SLACK_CHANNEL, color: 'good',
            //   message: "✅ ShopFlow ${IMAGE_TAG} deployed to production."
        }
        failure {
            echo "❌  Build ${env.BUILD_NUMBER} FAILED."
            // slackSend channel: SLACK_CHANNEL, color: 'danger',
            //   message: "❌ ShopFlow build failed — ${env.BUILD_URL}"
        }
        always {
            cleanWs()
        }
    }
}
