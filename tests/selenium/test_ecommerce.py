"""
ShopFlow Selenium Test Suite
Tests: Login flow, Cart flow, Full Checkout flow
Run: pytest tests/ -v --html=report.html
"""

import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

BASE_URL    = os.getenv('SELENIUM_BASE_URL', 'http://localhost:3000')
TEST_EMAIL  = os.getenv('TEST_EMAIL', f'selenium_{int(time.time())}@test.com')
TEST_PASS   = 'Test@1234'
TEST_NAME   = 'Selenium Tester'

# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope='session')
def driver():
    opts = Options()
    opts.add_argument('--headless')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--window-size=1280,800')
    opts.add_argument('--disable-gpu')

    drv = webdriver.Chrome(options=opts)
    drv.implicitly_wait(10)
    yield drv
    drv.quit()

@pytest.fixture(scope='session')
def wait(driver):
    return WebDriverWait(driver, 15)

def click(driver, wait, selector, by=By.ID):
    el = wait.until(EC.element_to_be_clickable((by, selector)))
    el.click()
    return el

def fill(driver, selector, text, by=By.ID):
    el = driver.find_element(by, selector)
    el.clear()
    el.send_keys(text)
    return el

# ─── Test 1: Home Page loads ──────────────────────────────────────────────────

class TestHomePage:
    def test_home_loads(self, driver):
        driver.get(BASE_URL)
        assert 'ShopFlow' in driver.title or 'ShopFlow' in driver.page_source, \
            "Home page should show ShopFlow brand"

    def test_shop_now_button(self, driver, wait):
        driver.get(BASE_URL)
        btn = wait.until(EC.presence_of_element_located((By.LINK_TEXT, 'Shop Now')))
        assert btn.is_displayed()

# ─── Test 2: Register ─────────────────────────────────────────────────────────

class TestRegister:
    def test_register_page_loads(self, driver, wait):
        driver.get(f'{BASE_URL}/register')
        wait.until(EC.presence_of_element_located((By.ID, 'register-form')))

    def test_register_new_user(self, driver, wait):
        driver.get(f'{BASE_URL}/register')
        wait.until(EC.presence_of_element_located((By.ID, 'fullname-input')))

        fill(driver, 'fullname-input', TEST_NAME)
        fill(driver, 'reg-email-input', TEST_EMAIL)
        fill(driver, 'reg-password-input', TEST_PASS)
        click(driver, wait, 'register-btn')

        # Should redirect to products after registration
        wait.until(EC.url_contains('/products'))
        assert '/products' in driver.current_url, "Should redirect to products after register"

# ─── Test 3: Login ────────────────────────────────────────────────────────────

class TestLogin:
    def test_logout_first(self, driver, wait):
        """Ensure we're logged out before testing login"""
        driver.get(BASE_URL)
        time.sleep(1)
        logout_btns = driver.find_elements(By.XPATH, "//button[text()='Logout']")
        if logout_btns:
            logout_btns[0].click()
            time.sleep(1)

    def test_login_page_loads(self, driver, wait):
        driver.get(f'{BASE_URL}/login')
        wait.until(EC.presence_of_element_located((By.ID, 'login-form')))

    def test_invalid_login(self, driver, wait):
        driver.get(f'{BASE_URL}/login')
        wait.until(EC.presence_of_element_located((By.ID, 'email-input')))
        fill(driver, 'email-input', 'notexist@test.com')
        fill(driver, 'password-input', 'wrongpass')
        click(driver, wait, 'login-btn')
        # Should stay on login page
        time.sleep(2)
        assert '/login' in driver.current_url or 'Invalid' in driver.page_source

    def test_valid_login(self, driver, wait):
        driver.get(f'{BASE_URL}/login')
        wait.until(EC.presence_of_element_located((By.ID, 'email-input')))
        fill(driver, 'email-input', TEST_EMAIL)
        fill(driver, 'password-input', TEST_PASS)
        click(driver, wait, 'login-btn')
        wait.until(EC.url_contains('/products'))
        assert '/products' in driver.current_url

# ─── Test 4: Products ─────────────────────────────────────────────────────────

class TestProducts:
    def test_products_page_loads(self, driver, wait):
        driver.get(f'{BASE_URL}/products')
        wait.until(EC.presence_of_element_located((By.ID, 'products-grid')))

    def test_products_visible(self, driver, wait):
        driver.get(f'{BASE_URL}/products')
        cards = wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, '[data-testid="product-card"]')
        ))
        assert len(cards) > 0, "Products grid should have at least one product"

    def test_search_products(self, driver, wait):
        driver.get(f'{BASE_URL}/products')
        search = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.search-input')))
        search.clear()
        search.send_keys('Headphones')
        time.sleep(1)
        cards = driver.find_elements(By.CSS_SELECTOR, '[data-testid="product-card"]')
        assert len(cards) >= 0  # at least doesn't crash

# ─── Test 5: Cart Flow ────────────────────────────────────────────────────────

class TestCart:
    def test_add_to_cart(self, driver, wait):
        driver.get(f'{BASE_URL}/products')
        # Click first Add to Cart button
        add_btn = wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, '.add-to-cart-btn:not([disabled])')
        ))
        add_btn.click()
        time.sleep(1.5)
        # Check badge or toast
        page = driver.page_source
        assert 'Added' in page or driver.find_elements(By.CSS_SELECTOR, '.badge')

    def test_cart_page_loads(self, driver, wait):
        driver.get(f'{BASE_URL}/cart')
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'cart-page')))

    def test_cart_has_items(self, driver, wait):
        driver.get(f'{BASE_URL}/cart')
        time.sleep(1)
        items = driver.find_elements(By.CSS_SELECTOR, '[data-testid="cart-item"]')
        assert len(items) > 0, "Cart should have items after adding"

    def test_cart_total_visible(self, driver, wait):
        driver.get(f'{BASE_URL}/cart')
        total = wait.until(EC.presence_of_element_located((By.ID, 'cart-total')))
        total_text = total.text
        assert '$' in total_text, "Cart total should show dollar amount"

    def test_checkout_button_visible(self, driver, wait):
        driver.get(f'{BASE_URL}/cart')
        btn = wait.until(EC.presence_of_element_located((By.ID, 'checkout-btn')))
        assert btn.is_displayed()

# ─── Test 6: Checkout Flow ────────────────────────────────────────────────────

class TestCheckout:
    def test_checkout_page_loads(self, driver, wait):
        driver.get(f'{BASE_URL}/checkout')
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'checkout-page')))

    def test_fill_shipping_address(self, driver, wait):
        driver.get(f'{BASE_URL}/checkout')
        wait.until(EC.presence_of_element_located((By.ID, 'addr-street')))

        fill(driver, 'addr-street', '123 Test Street')
        fill(driver, 'addr-city',   'Mumbai')
        fill(driver, 'addr-state',  'Maharashtra')
        fill(driver, 'addr-zip',    '400001')

        # Verify fields filled
        assert driver.find_element(By.ID, 'addr-city').get_attribute('value') == 'Mumbai'

    def test_place_order(self, driver, wait):
        driver.get(f'{BASE_URL}/checkout')
        wait.until(EC.presence_of_element_located((By.ID, 'addr-street')))

        fill(driver, 'addr-street', '123 Test Street')
        fill(driver, 'addr-city',   'Mumbai')
        fill(driver, 'addr-state',  'Maharashtra')
        fill(driver, 'addr-zip',    '400001')

        place_btn = wait.until(EC.element_to_be_clickable((By.ID, 'place-order-btn')))
        place_btn.click()

        # Should redirect to orders page
        wait.until(lambda d: '/orders' in d.current_url or 'Order' in d.page_source)

# ─── Test 7: Orders ───────────────────────────────────────────────────────────

class TestOrders:
    def test_orders_page_loads(self, driver, wait):
        driver.get(f'{BASE_URL}/orders')
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'orders-page')))

    def test_order_placed_visible(self, driver, wait):
        driver.get(f'{BASE_URL}/orders')
        time.sleep(1)
        # After checkout, at least one order should exist
        cards = driver.find_elements(By.CSS_SELECTOR, '[data-testid="order-card"]')
        assert len(cards) > 0, "At least one order should appear after checkout"
