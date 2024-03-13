'use strict';

/**
 * Handle the post payment GOcuotas authorization
 *
 * @param handlePaymentResult
 * @param {dw.order.Order} order
 * @param {Object} options
 * @param {Object} postAuthorization
 * @returns {{error: string, cartError: string, redirectUrl: string}}
 */
function postAuthorization(handlePaymentResult, order, options, postAuthorization) {
    if (!handlePaymentResult.error && session.custom.gocuotasURLGateway) {
        var redirect = session.custom.gocuotasURLGateway;

        delete session.custom.gocuotasURLGateway;
        return {
            error: 'redirect',
            cartError: 'redirect',
            redirectUrl: redirect
        };
    }
}

exports.postAuthorization = postAuthorization;
