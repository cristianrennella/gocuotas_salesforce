var ArrayList = require("dw/util/ArrayList");
var Logger = require("dw/system/Logger");
var Order = require("dw/order/Order");
var OrderMgr = require("dw/order/OrderMgr");
var Resource = require("dw/web/Resource");
var Site = require('dw/system/Site');
var Status = require("dw/system/Status");
var Transaction = require("dw/system/Transaction");

function execute(params) {
    var orders = getCreatedOrders();
    Logger.info('Orders found: ' + orders.size());

    if (orders.size() === 0) {
        return new Status(Status.OK, "NO_ORDERS_FOUND", "No orders found");
    }

    var success = updateOrders(orders);
    if (!success) {
        return new Status(Status.ERROR, "ERROR", 'Review the logs for more information');
    }
    return new Status(Status.OK, "OK", "Orders updated successfully");
}

function getCreatedOrders() {
    var query = "status = {0} AND paymentStatus = {1}";
    var orders =  OrderMgr.searchOrders(query, "creationDate ASC", Order.ORDER_STATUS_CREATED, Order.PAYMENT_STATUS_NOTPAID);

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

function updateOrders(orders) {
    var Gocuotas = require('*/cartridge/scripts/helpers/Gocuotas');
    var gocuotas = new Gocuotas();
    var authenticationResponse = gocuotas.authentication();
    if (!authenticationResponse) {
        Logger.error(Resource.msg("service.error.authentication", "gocuotas", null));
        return false;
    }
    var token = authenticationResponse.token;

    var site = Site.getCurrent();
    var localeID = site.defaultLocale;

    var orders = orders.iterator();
    while (orders.hasNext()) {
        Logger.info('-----------------------------------------------------------------------------');
        var order = orders.next();
        try {
            updateOrder(order, gocuotas, token, localeID);
        } catch(error) {
            Logger.error('Error on updating order: {0} - {1}', order.orderNo, error);
        }
    }
    Logger.info('-----------------------------------------------------------------------------');
    return true;
}

function updateOrder(order, gocuotas, token, localeID) {
    var GocuotasUtils = require('*/cartridge/scripts/utils/gocuotasUtils');

    var gocuotasOrderId = order.custom.gocuotasOrderId;
    Logger.info('Procesing order: ' + order.orderNo + ' - gocuotasOrderId: ' + gocuotasOrderId)

    var gocuotasOrder = gocuotas.getOrder(gocuotasOrderId, token);
    if (!gocuotasOrder) {
        Logger.error(Resource.msg("service.error.getorder", "gocuotas", null));
        return;
    }

    GocuotasUtils.updateOrder(order, gocuotasOrder, localeID);
    Logger.info('GOcuotas order was updated');
}



module.exports.execute = execute;