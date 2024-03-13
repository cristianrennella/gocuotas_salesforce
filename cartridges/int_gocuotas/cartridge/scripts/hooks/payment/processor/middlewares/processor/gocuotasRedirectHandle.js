'use strict';

var Logger = require('dw/system/Logger');
var PaymentMgr = require('dw/order/PaymentMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');

var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');
var GocuotasUtils = require('*/cartridge/scripts/utils/gocuotasUtils');

function Handle(basket) {
    var currentBasket = basket;
    var fieldErrors = {};
    var serverErrors = [];
    var error = false;
    var success = true;

    try {
        var paymentProcessor = PaymentMgr.getPaymentMethod(GocuotasConstants.PAYMENT_METHOD_REDIRECT).getPaymentProcessor();

        Transaction.wrap(function () {
            var paymentInstruments = currentBasket.getPaymentInstruments();
            collections.forEach(paymentInstruments, function (item) {
                currentBasket.removePaymentInstrument(item);
            });

            var paymentInstrument = currentBasket.createPaymentInstrument(GocuotasConstants.PAYMENT_METHOD_REDIRECT, GocuotasUtils.getTotalAmount(currentBasket));
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        });
    } catch (e) {
        Logger.error(e.message);
        serverErrors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
        error = true;
        success = false;
    }

    return {
        fieldErrors: fieldErrors,
        serverErrors: serverErrors,
        error: error,
        success: success
    };
}

module.exports = {
    Handle: Handle
}
