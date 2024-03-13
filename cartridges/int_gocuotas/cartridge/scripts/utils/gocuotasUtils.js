var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var Order = require("dw/order/Order");
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require("dw/web/URLUtils");

var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var collections = require("*/cartridge/scripts/util/collections");

var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');

function getTotalAmount(order) {
    var _order = order;
    let totalAmount = _order.getTotalGrossPrice();

    _order.getGiftCertificatePaymentInstruments()
        .toArray()
        .forEach((item) => {
            if (item.paymentTransaction && item.paymentTransaction.amount) {
                totalAmount = totalAmount.subtract(item.paymentTransaction.amount);
            }
        });

    return totalAmount;
};

function calculateInCents(amount) {
    var amountInCents = amount.toFixed(2);
    amountInCents = amountInCents * 100;
    amountInCents = amountInCents.toFixed(0);
    amountInCents = parseInt(amountInCents);
    return amountInCents;
}

function restoreBasket(orderId) {
    var basket = null;
    try {
        var order = OrderMgr.getOrder(orderId);
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
            basket = BasketMgr.createBasketFromOrder(order);
        });
    } catch (error) { 
        Logger.error(error.message);
    }
    return basket;
}

function apiCheckoutPayload(order) {
    var amount = getTotalAmount(order).value;
    var amountInCents = calculateInCents(amount);

    var urlSuccess = URLUtils.https('Gocuotas-Success', 'orderID', order.orderNo, 'orderToken', order.orderToken).toString();
    var urlFailure = URLUtils.https('Gocuotas-Failure', 'orderID', order.orderNo).toString();
    var orderNo = order.orderNo;
    var webhookUrl = URLUtils.https("Gocuotas-Webhook").toString();

    var email = '';
    var phone = '';
    collections.forEach(order.getPaymentInstruments(), (payInstrument) => {
        if (payInstrument.paymentMethod === GocuotasConstants.PAYMENT_METHOD_REDIRECT) {
            email = order.customerEmail;
            phone = order.billingAddress.phone;
        }        
    });

    var payload = {
        amount_in_cents: amountInCents,
        url_success: urlSuccess,
        url_failure: urlFailure,
        order_reference_id: orderNo,
        webhook_url: webhookUrl,
        email: email,
        phone_number: phone
    };
    return payload;
}

function placeOrder(order, localeID) {
    var placeOrderResult = COHelpers.placeOrder(order, { status: true });
    if (placeOrderResult.error) {
        return false;
    }

    var addressBook = order.customer.addressBook;
    if (addressBook) {
        // Save all used shipping addresses to address book of the logged in customer
        var allAddresses = addressHelpers.gatherShippingAddresses(order);
        allAddresses.forEach(function (address) {
            if (!addressHelpers.checkIfAddressStored(address, addressBook.addresses)) {
                addressHelpers.saveAddress(address, { raw: order.customer }, addressHelpers.generateAddressName(address));
            }
        });
    }

    if (order.getCustomerEmail()) {
        COHelpers.sendConfirmationEmail(order, localeID);
    }
    return true;
}

function validatePayment(order, gocuotasOrder) {
    var orderAmount = getTotalAmount(order).value;
    var orderAmountInCents = calculateInCents(orderAmount);

    var gocuotasAmountInCents = gocuotasOrder.amount_in_cents;

    if (orderAmountInCents === gocuotasAmountInCents) {
        return true;
    }
    var message = Resource.msg("note.order.invalid.payment.amount.1", "gocuotas", null) + " - " 
                + Resource.msgf("note.order.invalid.payment.amount.2", "gocuotas", null, orderAmountInCents, gocuotasAmountInCents);
    Logger.error(message);
    Transaction.wrap(() => {
        order.addNote(
            Resource.msg("note.order.invalid.payment.amount.1", "gocuotas", null), 
            Resource.msgf("note.order.invalid.payment.amount.2", "gocuotas", null, orderAmountInCents, gocuotasAmountInCents)
        );
    });
    return false;
}

function cancelOrder(order) {
    Transaction.wrap(() => {
        order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
    });

    var orderStatus = order.status.value;
    if (orderStatus === Order.ORDER_STATUS_CREATED) {
        Transaction.wrap(() => {
            OrderMgr.failOrder(order, true);
        });
    } else if (orderStatus === Order.ORDER_STATUS_NEW || orderStatus === Order.ORDER_STATUS_OPEN) {
        Transaction.wrap(() => {
            OrderMgr.cancelOrder(order);
            order.custom.gocuotasRefunded = true;
        });
    }
}

function payOrder(order, localeID) {
    Transaction.wrap(() => {
        order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
    });

    var orderStatus = order.status.value;
    if (orderStatus !== Order.ORDER_STATUS_CREATED) {
        Logger.info(Resource.msgf("info.order.status", "gocuotas", null, orderStatus))
        return false;
    }

    var result = placeOrder(order, localeID);
    if (!result) {
        Logger.error(Resource.msgf("error.order.place", "gocuotas", null, order.orderNo));
    }
}

function updateOrder(order, gocuotasOrder, localeID) {
    var gocuotasStatus = gocuotasOrder.status;

    var isPaymentValid = validatePayment(order, gocuotasOrder);
    if (!isPaymentValid) {
        cancelOrder(order);
    } else if (gocuotasStatus === GocuotasConstants.GOCUOTAS_STATUS_APPROVED) {
        payOrder(order, localeID);
    } else if (gocuotasStatus === GocuotasConstants.GOCUOTAS_STATUS_CANCEL || gocuotasStatus === GocuotasConstants.GOCUOTAS_STATUS_PARTIAL_REFUND) {
        cancelOrder(order);
    }

    Transaction.wrap(() => {
        order.addNote(Resource.msg("note.order.gocuotas.status", "gocuotas", null),  gocuotasStatus);
        order.custom.gocuotasOrderId = gocuotasOrder.id;
    });
}

module.exports = {
    getTotalAmount: getTotalAmount,
    calculateInCents: calculateInCents,
    restoreBasket: restoreBasket,
    apiCheckoutPayload: apiCheckoutPayload,
    updateOrder: updateOrder
}
