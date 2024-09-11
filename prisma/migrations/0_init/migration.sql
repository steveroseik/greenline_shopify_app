-- CreateTable
CREATE TABLE `shopify_session` (
    `id` VARCHAR(255) NOT NULL,
    `shop` VARCHAR(255) NOT NULL,
    `state` VARCHAR(255) NOT NULL,
    `isOnline` BIT(1) NOT NULL DEFAULT (b'0'),
    `scope` VARCHAR(255) NULL,
    `expires` TIMESTAMP(3) NULL,
    `accessToken` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ballot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NULL,
    `rackId` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    INDEX `rackId`(`rackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `box` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NULL,
    `ballotId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    INDEX `ballotId`(`ballotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courier-sheet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(255) NOT NULL,
    `status` ENUM('In Progress', 'Waiting For Admin Approval', 'Waiting For Finance Approval', 'Completed') NOT NULL DEFAULT 'In Progress',
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `REL_5cf8d1697a480108aea845cd49`(`userId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `IDX_64a01b97784000aeaebee8146c`(`phone`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer-address` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `country` VARCHAR(255) NOT NULL,
    `governorateId` INTEGER NULL,
    `city` VARCHAR(255) NOT NULL,
    `state` VARCHAR(40) NULL,
    `streetAddress` VARCHAR(255) NOT NULL,
    `zipCode` VARCHAR(10) NULL,
    `buildingNumber` VARCHAR(10) NOT NULL DEFAULT '0',
    `apartmentFloor` VARCHAR(10) NOT NULL DEFAULT '0',
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee` (
    `id` VARCHAR(255) NOT NULL,
    `type` ENUM('Admin', 'Finance', 'Inventory', 'Courier', 'Customer Service') NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `salary` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Salary', 'Rent', 'Utilities', 'Office Supplies', 'Vehicle Maintenance', 'Fuel', 'Insurance', 'Equipment Purchase', 'Marketing', 'Software Subscriptions', 'Legal Fees', 'Training', 'Taxes', 'Loan Repayments', 'Interest', 'Office Rent', 'Warehouse Rent', 'Travel Expenses', 'Professional Services', 'Maintenance', 'Security Services', 'Packaging Materials', 'Cleaning Services', 'Waste Disposal', 'Office Equipment', 'Internet Services', 'Telecommunication', 'Office Furniture', 'Membership Fees', 'Professional Development', 'Vehicle Lease', 'Advertising', 'Delivery Expenses', 'Miscellaneous') NOT NULL DEFAULT 'Miscellaneous',
    `fromAccountId` INTEGER NOT NULL,
    `approvedById` VARCHAR(255) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `receipt` VARCHAR(255) NULL,
    `comment` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fromAccountId`(`fromAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial-account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('Hub', 'User', 'Merchant', 'Bank', 'Department') NOT NULL,
    `userId` VARCHAR(255) NULL,
    `merchantId` INTEGER NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    UNIQUE INDEX `IDX_afa2b261f0ef4e4df531d4e333`(`merchantId`),
    INDEX `userId`(`userId`),
    UNIQUE INDEX `IDX_3b2bd4e59538923b62cedcf26e`(`userId`, `merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial-transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Deposit', 'Withdrawal', 'Order Collection', 'Shipping Collection', 'Courier Collection', 'Courier Collection Transfer', 'Merchant Order Payment', 'Transfer', 'Refund', 'Adjustment', 'Interest', 'Donation', 'Conversion', 'Reward', 'Subscription', 'Inventory Rent', 'Payment', 'Taxes', 'Other') NOT NULL,
    `description` VARCHAR(255) NULL,
    `fromAccountId` INTEGER NULL,
    `sheetOrderId` INTEGER NULL,
    `toAccountId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NULL,
    `receipt` VARCHAR(255) NULL,
    `status` ENUM('Pending Sender', 'Pending Receiver', 'Processing', 'Processing By Sender', 'Processing By Receiver', 'Rejected', 'Rejected By Sender', 'Rejected By Receiver', 'Completed', 'Cancelled By Sender', 'Cancelled By Receiver', 'Cancelled', 'Failed', 'Pending Internal', 'Transferred') NOT NULL,
    `auditedById` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fromAccountId`(`fromAccountId`),
    INDEX `toAccountId`(`toAccountId`),
    INDEX `FK_f1ff346f86d136c4254c7082366`(`sheetOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hub` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(15) NOT NULL,
    `gonvernorateId` INTEGER NOT NULL,
    `zoneId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hubId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `module` INTEGER NOT NULL DEFAULT 0,
    `zoneId` INTEGER NULL,
    `location` point NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory-item-history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemInBoxId` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `type` ENUM('Import', 'Order Return', 'Export', 'Order Export') NOT NULL,
    `amount` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `itemInBoxId`(`itemInBoxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory-rent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NOT NULL,
    `type` ENUM('Item', 'Order', 'Box', 'Ballot', 'Rack', 'Inventory', 'Meter') NOT NULL,
    `startDate` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastBill` TIMESTAMP(3) NULL,
    `pricePerUnit` DECIMAL(10, 2) NOT NULL,
    `sqaureMeter` DECIMAL(10, 0) NULL,
    `currency` VARCHAR(3) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory-support` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `governorateId` INTEGER NOT NULL,
    `zoneId` INTEGER NOT NULL,

    INDEX `inventoryId`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `shopifyId` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `currency` VARCHAR(3) NOT NULL,
    `imageUrl` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `merchantId`(`merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item-in-box` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `merchantId` INTEGER NOT NULL,
    `itemVariantId` INTEGER NOT NULL,
    `boxId` INTEGER NOT NULL,
    `count` INTEGER NOT NULL,
    `minCount` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    INDEX `boxId`(`boxId`),
    INDEX `itemVariantId`(`itemVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopifyShop` VARCHAR(255) NULL,
    `name` VARCHAR(255) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'EGP',
    `includesVAT` BOOLEAN NOT NULL,
    `threshold` DECIMAL(10, 2) NOT NULL DEFAULT 3.00,
    `overShipping` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant-customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `customerName` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `IDX_9ec978b0eed82c4abd11468b5b`(`merchantId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant-customer-address` (
    `merchantId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `addressId` INTEGER NOT NULL,

    INDEX `FK_aa9615b1c8ca9a02fcf2f44c3af`(`addressId`),
    UNIQUE INDEX `IDX_623d93315556b08dd1be7f939c`(`merchantId`, `customerId`, `addressId`),
    PRIMARY KEY (`merchantId`, `customerId`, `addressId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant-visit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Order Pickup', 'Order Returns', 'Supply Pickup') NOT NULL,
    `merchantId` INTEGER NOT NULL,
    `fromDate` TIMESTAMP(3) NOT NULL,
    `toDate` TIMESTAMP(3) NOT NULL,
    `status` ENUM('Scheduled', 'Assigned to Courier', 'On The Way', 'Completed', 'Canceled', 'Rescheduled', 'Returned', 'Supplies Delivered') NOT NULL DEFAULT 'Scheduled',
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `migrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `otherId` INTEGER NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'EGP',
    `previousOrderId` INTEGER NULL,
    `type` ENUM('Delivery', 'Exchange', 'Return', 'Free Shipping', 'Free Of Charge') NOT NULL DEFAULT 'Delivery',
    `paymentType` ENUM('Cash', 'Card', 'Free') NOT NULL DEFAULT 'Cash',
    `status` ENUM('Idle', 'Assembled', 'Dispatched', 'Picked Up', 'Arrived At Sort Facilities', 'Arrived At Hub', 'Transfered', 'Assigned To Courier', 'Delivered', 'Partially Delivered', 'Cancelled', 'Failed Delivery Attempt', 'Postponed', 'Return Requested', 'Returned', 'Partially Returned') NOT NULL DEFAULT 'Idle',
    `customerId` INTEGER NOT NULL,
    `addressId` INTEGER NOT NULL,
    `merchantId` INTEGER NOT NULL,
    `isDomestic` BIT(1) NOT NULL DEFAULT (b'1'),
    `originalPrice` BIT(1) NOT NULL DEFAULT (b'1'),
    `canBeEdited` BIT(1) NOT NULL DEFAULT (b'0'),
    `shippingPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `weight` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `price` DECIMAL(10, 2) NOT NULL,
    `canOpen` BIT(1) NOT NULL DEFAULT (b'0'),
    `fragile` BIT(1) NOT NULL DEFAULT (b'0'),
    `deliveryPart` BIT(1) NOT NULL DEFAULT (b'0'),
    `orderDate` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `REL_e1ac9c252ed1e2f8ae7cc3ca75`(`previousOrderId`),
    INDEX `FK_124456e637cca7a415897dce659`(`customerId`),
    INDEX `FK_73f9a47e41912876446d047d015`(`addressId`),
    INDEX `merchantId`(`merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order-item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `itemVariantId` INTEGER NOT NULL,
    `count` INTEGER NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `unitDiscount` DECIMAL(10, 2) NOT NULL,
    `partialCount` INTEGER NULL,
    `inventoryId` INTEGER NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `itemVariantId`(`itemVariantId`),
    UNIQUE INDEX `IDX_efbb7b2e09636e89b33af5f5e4`(`orderId`, `itemVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order-relation` (
    `firstOrderId` INTEGER NOT NULL,
    `secondOrderId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `secondOrderId`(`secondOrderId`),
    PRIMARY KEY (`firstOrderId`, `secondOrderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rack` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NULL,
    `inventoryId` INTEGER NOT NULL,
    `levels` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    INDEX `inventoryId`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Notification', 'Confirmation', 'Authorization', 'Subscription', 'Verification', 'Reminder', 'Invitation', 'Password Reset', 'Account Update', 'Transaction Update', 'Policy Update', 'Announcement', 'Feedback', 'Support', 'Marketing', 'Survey', 'Report', 'Inquiry', 'Appointment', 'Request', 'Order Problem', 'Payment Reminder', 'Invoice', 'Other') NOT NULL DEFAULT 'Notification',
    `priority` INTEGER NOT NULL,
    `fromId` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `extraData` VARCHAR(255) NULL,
    `status` ENUM('Sent', 'Pending', 'Read', 'Rejected', 'Accepted', 'Expired') NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fromId`(`fromId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request-status-history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `status` ENUM('Sent', 'Pending', 'Read', 'Rejected', 'Accepted', 'Expired') NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `requestId`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sheet-order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sheetId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `adminPass` BIT(1) NOT NULL DEFAULT (b'0'),
    `financePass` BIT(1) NOT NULL DEFAULT (b'0'),
    `shippingCollected` BIT(1) NOT NULL DEFAULT (b'0'),
    `amountCollected` DECIMAL(10, 2) NULL,
    `transactionId` INTEGER NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `IDX_bf19ed3d976f112b5639fc8960`(`orderId`),
    UNIQUE INDEX `REL_556942860602800c69caba7ce2`(`transactionId`),
    INDEX `orderId`(`orderId`),
    INDEX `sheetId`(`sheetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sheet-order-status-history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sheetOrderId` INTEGER NOT NULL,
    `status` ENUM('Admin Accepted', 'Admin Rejected', 'Finance Accepted', 'Finance Rejected') NOT NULL,
    `description` VARCHAR(255) NOT NULL DEFAULT '',
    `userId` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `sheetOrderId`(`sheetOrderId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(255) NOT NULL,
    `type` ENUM('Employee', 'Merchant', 'Customer') NOT NULL DEFAULT 'Customer',
    `hubId` INTEGER NULL,
    `merchantId` INTEGER NULL,
    `inventoryId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `birthdate` DATETIME(0) NOT NULL,
    `refreshToken` VARCHAR(64) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    UNIQUE INDEX `IDX_e12875dfb3b1d92d7d7c5377e2`(`email`),
    INDEX `FK_126cdfc5f79e8069cd41c6b4081`(`hubId`),
    INDEX `FK_48a28cfd87e34f3df960bb374ba`(`merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user-role` (
    `userId` VARCHAR(255) NOT NULL,
    `roleId` INTEGER NOT NULL,

    INDEX `userId`(`userId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Fixed', 'Percentage', 'Free Shipping') NOT NULL,
    `startDiscount` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDiscount` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `domestic-governorate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `arabicName` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `domestic-shipping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `total` DECIMAL(10, 2) NOT NULL,
    `vatDecimal` DECIMAL(10, 2) NOT NULL DEFAULT 0.14,
    `base` DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    `extra` DECIMAL(10, 2) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item-variant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NULL,
    `shopifyId` VARCHAR(255) NULL,
    `merchantSku` VARCHAR(255) NOT NULL,
    `merchantId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `isEnabled` BIT(1) NOT NULL DEFAULT (b'1'),
    `imageUrl` VARCHAR(255) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `weight` DECIMAL(10, 2) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` TIMESTAMP(3) NULL,

    UNIQUE INDEX `IDX_ccddccfa6fec9116e59c2236cf`(`sku`),
    INDEX `FK_2becf8705592d6e703e001be723`(`merchantId`),
    INDEX `FK_320f2483a9a7a6c8d9e2217bb3b`(`itemId`),
    UNIQUE INDEX `IDX_e8d2a9ac37b40ed052b894dffa`(`merchantSku`, `merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item-variant-option` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemVariantId` INTEGER NOT NULL,
    `variantNameId` INTEGER NOT NULL,
    `variantOptionId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FK_35784b4e2d3f73949fd614d6109`(`variantOptionId`),
    INDEX `FK_8ce23bb58ae1f6f30b062a3acc2`(`variantNameId`),
    UNIQUE INDEX `IDX_67dd5eb7e3dc02ae434a1dea74`(`itemVariantId`, `variantNameId`, `variantOptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant-domestic-shiping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NOT NULL,
    `governorateId` INTEGER NOT NULL,
    `domesticShippingId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FK_c109dbd2e0f3e966e2e74c76865`(`domesticShippingId`),
    UNIQUE INDEX `IDX_8616ae4918828a5580fe565adb`(`merchantId`, `governorateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `variant-name` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `variant-option` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(255) NOT NULL,
    `colorCode` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial-transaction-history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionId` INTEGER NOT NULL,
    `status` ENUM('Pending Sender', 'Pending Receiver', 'Processing', 'Processing By Sender', 'Processing By Receiver', 'Rejected', 'Rejected By Sender', 'Rejected By Receiver', 'Completed', 'Cancelled By Sender', 'Cancelled By Receiver', 'Cancelled', 'Failed', 'Pending Internal', 'Transferred') NOT NULL,
    `auditedById` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory-return` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `hubId` INTEGER NOT NULL,
    `restockedToId` INTEGER NULL,
    `packageId` INTEGER NULL,
    `orderItemId` INTEGER NOT NULL,
    `status` ENUM('Idle', 'Returned To Box') NOT NULL DEFAULT 'Idle',
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `REL_cd7ea81405de27ed292425cda5`(`orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item-return` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderItemId` INTEGER NOT NULL,
    `hubId` INTEGER NOT NULL,
    `merchantId` INTEGER NOT NULL,
    `packageId` INTEGER NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `REL_732d5223ac7a11dcf9739671a3`(`orderItemId`),
    INDEX `FK_450f3125a47db1226445e52e0fb`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order-history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `userId` VARCHAR(255) NOT NULL,
    `status` ENUM('Idle', 'Assembled', 'Dispatched', 'Picked Up', 'Arrived At Sort Facilities', 'Arrived At Hub', 'Transfered', 'Assigned To Courier', 'Delivered', 'Partially Delivered', 'Cancelled', 'Failed Delivery Attempt', 'Postponed', 'Return Requested', 'Returned', 'Partially Returned') NOT NULL DEFAULT 'Idle',
    `fromHubId` INTEGER NULL,
    `toHubId` INTEGER NULL,
    `inventoryId` INTEGER NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastModified` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `orderId`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `return-package` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(255) NOT NULL,
    `type` ENUM('Inventory', 'Merchant') NOT NULL,
    `hubId` INTEGER NOT NULL,
    `courierId` VARCHAR(255) NULL,
    `toInventoryId` INTEGER NULL,
    `toMerchantId` INTEGER NULL,
    `status` ENUM('Idle', 'Assigned To Courier', 'Transferring', 'Delivered') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `return-package-history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnPackageId` INTEGER NOT NULL,
    `status` ENUM('Idle', 'Assigned To Courier', 'Transferring', 'Delivered') NOT NULL,
    `description` TEXT NULL,
    `transferredToId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory-rent-transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchantId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `type` ENUM('Item', 'Order', 'Box', 'Ballot', 'Rack', 'Inventory', 'Meter') NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ballot` ADD CONSTRAINT `FK_b21481ded566767bcd543497379` FOREIGN KEY (`rackId`) REFERENCES `rack`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `box` ADD CONSTRAINT `FK_b6c0f7a8b3384dc928b79664098` FOREIGN KEY (`ballotId`) REFERENCES `ballot`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `courier-sheet` ADD CONSTRAINT `FK_5cf8d1697a480108aea845cd490` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `financial-account` ADD CONSTRAINT `FK_afa2b261f0ef4e4df531d4e3338` FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `financial-transaction` ADD CONSTRAINT `FK_2ea95968765ed9939c054062413` FOREIGN KEY (`toAccountId`) REFERENCES `financial-account`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `financial-transaction` ADD CONSTRAINT `FK_b0698ef060c5bf65d05645b6e63` FOREIGN KEY (`fromAccountId`) REFERENCES `financial-account`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `financial-transaction` ADD CONSTRAINT `FK_f1ff346f86d136c4254c7082366` FOREIGN KEY (`sheetOrderId`) REFERENCES `sheet-order`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory-support` ADD CONSTRAINT `FK_383d06b6150717b195551bba1b4` FOREIGN KEY (`inventoryId`) REFERENCES `inventory`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `item-in-box` ADD CONSTRAINT `FK_fe7ed7836ee4714bdcd98e3e59a` FOREIGN KEY (`boxId`) REFERENCES `box`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `merchant-customer-address` ADD CONSTRAINT `FK_aa9615b1c8ca9a02fcf2f44c3af` FOREIGN KEY (`addressId`) REFERENCES `customer-address`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `FK_1031171c13130102495201e3e20` FOREIGN KEY (`id`) REFERENCES `sheet-order`(`orderId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `FK_124456e637cca7a415897dce659` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `FK_293ad75db4c3b2aa62996c75ad1` FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `FK_73f9a47e41912876446d047d015` FOREIGN KEY (`addressId`) REFERENCES `customer-address`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `FK_e1ac9c252ed1e2f8ae7cc3ca75a` FOREIGN KEY (`previousOrderId`) REFERENCES `order`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order-item` ADD CONSTRAINT `FK_29ee234059c3b7a783bddac5bf8` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order-item` ADD CONSTRAINT `FK_c0c551d1822b6df1f352f34dc45` FOREIGN KEY (`itemVariantId`) REFERENCES `item-variant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sheet-order` ADD CONSTRAINT `FK_556942860602800c69caba7ce26` FOREIGN KEY (`transactionId`) REFERENCES `financial-transaction`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sheet-order` ADD CONSTRAINT `FK_d347664ae2df273959910ae62ec` FOREIGN KEY (`sheetId`) REFERENCES `courier-sheet`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `FK_126cdfc5f79e8069cd41c6b4081` FOREIGN KEY (`hubId`) REFERENCES `hub`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `FK_48a28cfd87e34f3df960bb374ba` FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user-role` ADD CONSTRAINT `FK_c7c1bb73f89bbdd47b4afb1bab9` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-variant` ADD CONSTRAINT `FK_2becf8705592d6e703e001be723` FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-variant` ADD CONSTRAINT `FK_320f2483a9a7a6c8d9e2217bb3b` FOREIGN KEY (`itemId`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-variant-option` ADD CONSTRAINT `FK_35784b4e2d3f73949fd614d6109` FOREIGN KEY (`variantOptionId`) REFERENCES `variant-option`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-variant-option` ADD CONSTRAINT `FK_8c889db18590c89e9fd3d3349aa` FOREIGN KEY (`itemVariantId`) REFERENCES `item-variant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-variant-option` ADD CONSTRAINT `FK_8ce23bb58ae1f6f30b062a3acc2` FOREIGN KEY (`variantNameId`) REFERENCES `variant-name`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `merchant-domestic-shiping` ADD CONSTRAINT `FK_c109dbd2e0f3e966e2e74c76865` FOREIGN KEY (`domesticShippingId`) REFERENCES `domestic-shipping`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `merchant-domestic-shiping` ADD CONSTRAINT `FK_f0f83e3e9a0704d2c2e9fb73c0d` FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory-return` ADD CONSTRAINT `FK_cd7ea81405de27ed292425cda5d` FOREIGN KEY (`orderItemId`) REFERENCES `order-item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-return` ADD CONSTRAINT `FK_450f3125a47db1226445e52e0fb` FOREIGN KEY (`packageId`) REFERENCES `return-package`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item-return` ADD CONSTRAINT `FK_732d5223ac7a11dcf9739671a3a` FOREIGN KEY (`orderItemId`) REFERENCES `order-item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

