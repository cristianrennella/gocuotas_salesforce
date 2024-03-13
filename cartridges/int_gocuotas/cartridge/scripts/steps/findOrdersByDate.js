var Calendar = require('dw/util/Calendar');
var Logger = require("dw/system/Logger");
var OrderMgr = require("dw/order/OrderMgr");
var Site = require('dw/system/Site');
var Status = require("dw/system/Status");
var Transaction = require("dw/system/Transaction");

function execute(params) {
    var { untilMinutesAgo, gmt } = params;

    var { startDate, endDate } = getDates(untilMinutesAgo, gmt);

    var gocuotasOrders = getOrdersByDateRange(startDate, endDate);
    if (!gocuotasOrders) {
        return new Status(Status.ERROR, "ERROR", 'Review the logs for more information');
    }
    if (gocuotasOrders.length === 0) {
        return new Status(Status.OK, "NO_ORDERS_FOUND", "No orders found");
    }
    updateGocuotasOrderIds(gocuotasOrders);
}

function getDates(untilMinutesAgo, gmt) {
    var calendar = Site.getCurrent().getCalendar();
    calendar.add(Calendar.HOUR, gmt)

    var endDate = new Date(calendar.getTime());

    calendar.add(Calendar.MINUTE, -1 * untilMinutesAgo);
    var startDate = new Date(calendar.getTime());


    startDate = dateFormat(startDate);
    endDate = dateFormat(endDate);

    return {
        startDate: startDate,
        endDate: endDate,
    };
}

function dateFormat(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    var hour = date.getHours();
    var minute = date.getMinutes();

    return year + '-' + month + '-' + day + '%20' + hour + ':' + minute;
}

function getOrdersByDateRange(startDate, endDate) {
    var Gocuotas = require('*/cartridge/scripts/helpers/Gocuotas');

    var gocuotas = new Gocuotas();
    var authenticationResponse = gocuotas.authentication();
    if (!authenticationResponse) {
        Logger.error(Resource.msg("service.error.authentication", "gocuotas", null));
        return null;
    }
    var token = authenticationResponse.token;

    var gocuotasOrders = gocuotas.getOrderByDateRange(startDate, endDate, token);
    if (!gocuotasOrders) {
        Logger.error(Resource.msg("service.error.getorder.dates", "gocuotas", null));
        return null;
    }
    Logger.info('Found ' + gocuotasOrders.length + ' in GOcuotas')
    return gocuotasOrders;
}

function updateGocuotasOrderIds(gocuotasOrders) {
    for (var i = 0; i < gocuotasOrders.length; i ++) {
        Logger.info('-----------------------------------------------------------------------------');
        var gocuotasOrder = gocuotasOrders[i];

        var gocuotasOrderId = gocuotasOrder.id;
        var salesforceOrderId = gocuotasOrder.order_reference_id;
        Logger.info('GOcuotas Order: ' + gocuotasOrder.id + ' - Salesforce Order ' + salesforceOrderId);

        var order = OrderMgr.getOrder(salesforceOrderId);
        if (!order) {
            Logger.warn('Order not found: ' + salesforceOrderId);
            continue;
        }

        if (order.custom.gocuotasOrderId || order.custom.gocuotasOrderId !== '') {
            Logger.info('The order was previously updated');
            continue;
        }

        Transaction.wrap(function () {
            order.custom.gocuotasOrderId = gocuotasOrderId;
        });
        Logger.info('Updated Salesforce order')
    }
    Logger.info('-----------------------------------------------------------------------------');
}

module.exports.execute = execute;