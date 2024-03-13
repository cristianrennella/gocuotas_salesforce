'use strict';

var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
var PaymentMgr = require('dw/order/PaymentMgr');
var Resource = require('dw/web/Resource');
var Site = require("dw/system/Site");
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');
var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');
var GocuotasUtils = require('*/cartridge/scripts/utils/gocuotasUtils');

function GoCuotas() {
    this.__createService = function() {
        var serviceID = GocuotasConstants.SERVICE_ID;
        var service = LocalServiceRegistry.createService(serviceID, {
            createRequest: function (svc, args) {
                var baseURL = svc.getURL();
    
                svc.setRequestMethod(args.method);
                svc.setURL(baseURL + args.endpoint);
                svc.addHeader('Content-Type', 'application/json');
    
                if (args.auth) {
                    svc.addHeader('Authorization', args.auth);
                }
    
                if (empty(args.payload)) return null;
    
                return JSON.stringify(args.payload);
            },
            parseResponse: function (svc, response) {
                return JSON.parse(response.text);
            },
            filterLogMessage: function( msg ) {
                return msg;
            },
        });
        return service;
    }

    this.__exec = function (args) {
        var response = this.__createService().call(args);
        return response;
    };
}

GoCuotas.prototype.authentication = function() {
    var gocuotasEmail = Site.getCurrent().getCustomPreferenceValue(GocuotasConstants.PREFERENCES_GOCUOTASEMAIL);
    var gocuotasPassword = Site.getCurrent().getCustomPreferenceValue(GocuotasConstants.PREFERENCES_GOCUOTASPASSWORD);
    var serviceUrl = GocuotasConstants.SERVICE_URL_AUTHENTICATION;

    var endpoint = serviceUrl + '?email=' + gocuotasEmail + '&password=' + gocuotasPassword;

    var params = {
        method: 'POST',
        endpoint: endpoint
    }
    var result = this.__exec(params);
    if (!result || !result.ok) {
        return null;
    }
    return result.object;
}

GoCuotas.prototype.checkout = function(order, token) {
    var serviceUrl = GocuotasConstants.SERVICE_URL_CHECKOUT;

    var auth = 'Bearer ' + token;
    var payload = GocuotasUtils.apiCheckoutPayload(order);
    var endpoint = serviceUrl;

    var params = {
        method: 'POST',
        endpoint: endpoint,
        payload: payload,
        auth: auth
    }
    var result = this.__exec(params);
    if (!result || !result.ok) {
        return null;
    }
    return result.object;
}

GoCuotas.prototype.getOrder = function(gocuotasOrderId, token) {
    var serviceUrl = GocuotasConstants.SERVICE_URL_GETORDER;

    var auth = 'Bearer ' + token;
    var endpoint = serviceUrl + gocuotasOrderId;

    var params = {
        method: 'GET',
        endpoint: endpoint,
        auth: auth
    }
    var result = this.__exec(params);
    if (!result || !result.ok) {
        return null;
    }
    return result.object;
}

GoCuotas.prototype.refundOrder = function(gocuotasOrderId, token) {
    var serviceUrl = GocuotasConstants.SERVICE_URL_REFUNDORDER;

    var auth = 'Bearer ' + token;
    var endpoint = serviceUrl + gocuotasOrderId;

    var params = {
        method: 'DELETE',
        endpoint: endpoint,
        auth: auth
    }
    var result = this.__exec(params);
    if (!result.ok) {
        return null;
    }
    return result.object;
}

GoCuotas.prototype.getOrderByDateRange = function(startDate, endDate, token) {
    var serviceUrl = GocuotasConstants.SERVICE_URL_GETORDER;

    var auth = 'Bearer ' + token;
    var endpoint = serviceUrl + '?delivered_start=' + startDate + '&delivered_end=' + endDate;

    var params = {
        method: 'GET',
        endpoint: endpoint,
        auth: auth
    }
    var result = this.__exec(params);
    if (!result || !result.ok) {
        return null;
    }
    return result.object;
}


module.exports = GoCuotas;
