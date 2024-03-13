var ArrayList = require("dw/util/ArrayList");
var Logger = require("dw/system/Logger");
var Order = require("dw/order/Order");
var OrderMgr = require("dw/order/OrderMgr");
var Resource = require("dw/web/Resource");
var Status = require("dw/system/Status");
var Transaction = require("dw/system/Transaction");

function execute(params) {
    var orders = getCancelledOrders();
    Logger.info('Orders found: ' + orders.size());

    if (orders.size() === 0) {
        return new Status(Status.OK, "NO_ORDERS_FOUND", "No orders found");
    }
    var success = cancelOrders(orders);
    if (!success) {
        return new Status(Status.ERROR, "ERROR", 'Review the logs for more information');
    }
    return new Status(Status.OK, "OK", "Orders cancelled successfully");
}

function getCancelledOrders() {
    var query = "status = {0} AND paymentStatus = {1} AND custom.gocuotasRefunded != {2}";
    var orders =  OrderMgr.searchOrders(query, "creationDate ASC", Order.ORDER_STATUS_CANCELLED, Order.PAYMENT_STATUS_PAID, true);

    var gocuotasOrders = filterOrdersByPaymentMethod(orders);
    return gocuotasOrders;
}

function filterOrdersByPaymentMethod(orders) {
    var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');

    var gocuotasOrders = new ArrayList();
    while (orders.hasNext()) {
        var order = orders.next();

        if (order.custom.gocuotasOrderId && (order.custom.gocuotasOrderId !== '')) {
            var paymentInstruments = order.paymentInstruments.iterator();
    
            while (paymentInstruments.hasNext()) {
                var paymentInstrument = paymentInstruments.next();
    
                if ([GocuotasConstants.PAYMENT_METHOD_REDIRECT].includes(paymentInstrument.paymentMethod)) {
                    gocuotasOrders.add(order);
                    break;
                }
            }
        }
    }
    return gocuotasOrders;
}

function cancelOrders(orders) {
    var Gocuotas = require('*/cartridge/scripts/helpers/Gocuotas');
    var gocuotas = new Gocuotas();
    var authenticationResponse = gocuotas.authentication();
    if (!authenticationResponse) {
        Logger.error(Resource.msg("service.error.authentication", "gocuotas", null));
        return false;
    }
    var token = authenticationResponse.token;

    var orders = orders.iterator();
    while (orders.hasNext()) {
        Logger.info('-----------------------------------------------------------------------------');
        var order = orders.next();
        try {
            cancelOrder(order, gocuotas, token);
        } catch(error) {
            Logger.error('Error on refunding order: {0} - {1}', order.orderNo, error);
        }
    }
    Logger.info('-----------------------------------------------------------------------------');
    return true;
}

function cancelOrder(order, gocuotas, token) {
    var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');

    var gocuotasOrderId = order.custom.gocuotasOrderId;
    Logger.info('Procesing order: ' + order.orderNo + ' - gocuotasOrderId: ' + gocuotasOrderId)

    var gocuotasOrder = gocuotas.getOrder(gocuotasOrderId, token);
    if (!gocuotasOrder) {
        Logger.error(Resource.msg("service.error.getorder", "gocuotas", null));
        return;
    }

    var gocuotasStatus = gocuotasOrder.status;
    Logger.info('GOcuotas order status is: ' + gocuotasStatus);

    if (gocuotasStatus === GocuotasConstants.GOCUOTAS_STATUS_CANCEL || gocuotasStatus === GocuotasConstants.GOCUOTAS_STATUS_PARTIAL_REFUND) {
        Transaction.wrap(function () {
            order.custom.gocuotasRefunded = true;
        });
        Logger.info('Salesforce order was updated with refund flag');
        return;
    }

    var gocuotasRefunds = gocuotas.refundOrder(gocuotasOrderId, token);
    if (!gocuotasRefunds || gocuotasRefunds.length == 0) {
        Logger.error(Resource.msg("service.error.refund", "gocuotas", null));
        return;
    }

    var gocuotasRefund = gocuotasRefunds[0];
    if (!gocuotasRefund || gocuotasRefund.status !== GocuotasConstants.GOCUOTAS_STATUS_APPROVED) {
        Logger.error(Resource.msg("service.error.refund", "gocuotas", null));
        return;
    }

    Logger.info('GOcuotas order was refunded');
    Transaction.wrap(function () {
        order.custom.gocuotasRefunded = true;
    });
    Logger.info('Salesforce order was updated with refund flag');
    Logger.info('Order was refunded successfully');
}

module.exports.execute = execute;