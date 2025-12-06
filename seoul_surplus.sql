CREATE DATABASE IF NOT EXISTS seoul_surplus
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE seoul_surplus;

CREATE TABLE categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80) NOT NULL UNIQUE,
  description   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL UNIQUE,
  description   VARCHAR(255),
  precedence    TINYINT UNSIGNED NOT NULL DEFAULT 100
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(80) NOT NULL UNIQUE,
  description   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  scope         JSON NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_perm_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_perm_perm FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50) NOT NULL UNIQUE,
  email           VARCHAR(120) NOT NULL UNIQUE,
  password_hash   CHAR(60) NOT NULL,
  role_id         INT NOT NULL,
  status          ENUM('active','suspended','invited') DEFAULT 'active',
  last_login_at   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE user_profiles (
  user_id        BIGINT UNSIGNED PRIMARY KEY,
  full_name      VARCHAR(120),
  phone          VARCHAR(30),
  timezone       VARCHAR(40) DEFAULT 'Asia/Seoul',
  pref_low_stock TINYINT(1) DEFAULT 1,
  pref_resv      TINYINT(1) DEFAULT 1,
  avatar_url     VARCHAR(255),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activity_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED,
  action        VARCHAR(160) NOT NULL,
  target_type   VARCHAR(60),
  target_id     VARCHAR(60),
  metadata      JSON,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE products (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku               VARCHAR(40) NOT NULL UNIQUE,
  name              VARCHAR(160) NOT NULL,
  brand             VARCHAR(80),
  category_id       INT,
  type              VARCHAR(120),
  size              VARCHAR(80),
  condition_grade   ENUM('New','Like New','Good','Fair') DEFAULT 'New',
  retail_price      DECIMAL(10,2) NOT NULL,
  original_price    DECIMAL(10,2),
  stock_quantity    INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  status            ENUM('active','archived','draft') DEFAULT 'active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    BIGINT UNSIGNED NOT NULL,
  image_url     VARCHAR(255) NOT NULL,
  is_primary    TINYINT(1) DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventory_movements (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id     BIGINT UNSIGNED NOT NULL,
  change_qty     INT NOT NULL,
  reason         VARCHAR(255) NULL,
  reference_type VARCHAR(50),
  reference_id   VARCHAR(60),
  transaction_id VARCHAR(64) UNIQUE,
  created_by     BIGINT UNSIGNED,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_movements_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE customers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(80),
  last_name     VARCHAR(80),
  email         VARCHAR(120),
  phone         VARCHAR(30),
  marketing_opt_in TINYINT(1) DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_email (email)
) ENGINE=InnoDB;

CREATE TABLE reservations (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_code VARCHAR(20) NOT NULL UNIQUE,
  customer_id     BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NOT NULL,
  reserved_price  DECIMAL(10,2) NOT NULL,
  status          ENUM('Pending','Confirmed','Declined','Cancelled') DEFAULT 'Pending',
  reserved_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pickup_at       DATETIME NULL,
  notes           VARCHAR(255),
  created_by      BIGINT UNSIGNED,
  CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_res_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_res_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE sales_orders (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number    VARCHAR(30) NOT NULL UNIQUE,
  customer_id     BIGINT UNSIGNED,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          ENUM('Draft','Pending','Paid','Cancelled','Refunded') DEFAULT 'Pending',
  payment_status  ENUM('Unpaid','Paid','Partial','Refunded') DEFAULT 'Unpaid',
  ordered_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by      BIGINT UNSIGNED,
  CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_sales_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE sales_order_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_order_id BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  subtotal      DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  CONSTRAINT fk_so_items_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_so_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE inventory_alerts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    BIGINT UNSIGNED NOT NULL,
  alert_type    ENUM('low_stock','out_of_stock') NOT NULL,
  severity      ENUM('info','warning','critical') NOT NULL,
  triggered_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   DATETIME NULL,
  CONSTRAINT fk_alerts_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

