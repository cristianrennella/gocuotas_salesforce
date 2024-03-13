'use strict';

var gocuotasRedirectAuthorize = require('*/cartridge/scripts/hooks/payment/processor/middlewares/processor/gocuotasRedirectAuthorize');
var gocuotasRedirectHandle = require('*/cartridge/scripts/hooks/payment/processor/middlewares/processor/gocuotasRedirectHandle');

/**
 * Verifies if GOcuotas information is valid. If the information is valid a
 * payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @return {Object} returns an error object
 */
function Handle(basket) {
    return gocuotasRedirectHandle.Handle(basket);
}

/**
 * Authorizes a payment using GOcuotas.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    return gocuotasRedirectAuthorize.Authorize(orderNumber, paymentInstrument, paymentProcessor);
}

exports.Handle = Handle;
exports.Authorize = Authorize;
