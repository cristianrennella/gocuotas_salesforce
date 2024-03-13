'use strict';

var Logger = require('dw/system/Logger');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');

var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');
var GocuotasUtils = require('*/cartridge/scripts/utils/gocuotasUtils');

var gocuotasRedirectHandle = require('*/cartridge/scripts/hooks/payment/processor/middlewares/processor/gocuotasRedirectHandle');

function handleError() {
    return {
        fieldErrors: { },
        serverErrors: [ Resource.msg('error.technical', 'checkout', null) ],
        error: true,
        success: false
    };
}


function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var Gocuotas = require('*/cartridge/scripts/helpers/Gocuotas');

    try {
        Transaction.wrap(() => {
            paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
        });

        var gocuotas = new Gocuotas();

        var authenticationResponse = gocuotas.authentication();
        if (!authenticationResponse) {
            Logger.error(Resource.msg("service.error.authentication", "gocuotas", null));
            return handleError();
        }
        var token = authenticationResponse.token;

        var order = OrderMgr.getOrder(orderNumber);
        var checkoutResponse = gocuotas.checkout(order, token);
        if (!checkoutResponse) {
            Logger.error(Resource.msg("service.error.checkout", "gocuotas", null));
            return handleError();
        }

        var urlGateway = checkoutResponse.url_init;

        Transaction.wrap(() => {
            paymentInstrument.custom.gocuotasURLGateway = urlGateway;
        });
        session.custom.gocuotasURLGateway = urlGateway;
    } catch (e) {
        Logger.error(e.message);
        return handleError();
    };

    return {
        fieldErrors: { },
        serverErrors: [ ],
        error: false,
        success: true
    };
}

module.exports = {
    Authorize: Authorize
}
