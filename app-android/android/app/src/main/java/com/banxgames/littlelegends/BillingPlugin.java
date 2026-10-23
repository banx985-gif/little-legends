package com.banxgames.littlelegends;

import android.content.pm.ApplicationInfo;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

// Job 18: Google Play Billing for the one-time "Unlock everything" (product id full_unlock, about A$4.99).
// The game calls it from src/store/FullUnlock.js with Capacitor.nativePromise('Billing', method):
//   status / restore -> { owned, pending, price, debug }   what this Google account owns, and the price in its currency
//   buy              -> { owned } | { cancelled } | { pending }   Google Play's own purchase sheet
// Nothing else goes over the network, and nothing about the child is ever sent.
@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String PRODUCT_ID = "full_unlock";
    private BillingClient client;
    private ProductDetails details;
    private PluginCall buying;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    private boolean debugBuild() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    // Connects to Google Play if needed, then runs `ready`; tells the game when the store can't be reached (offline).
    private void connect(PluginCall call, Runnable ready) {
        if (client.isReady()) { ready.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            private boolean answered = false;
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (answered) return;
                answered = true;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) ready.run();
                else call.reject("Google Play not available (" + result.getResponseCode() + ")");
            }
            @Override
            public void onBillingServiceDisconnected() {
                // The next call connects again.
            }
        });
    }

    private void loadDetails(Runnable done) {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build()))
            .build();
        client.queryProductDetailsAsync(params, (result, found) -> {
            List<ProductDetails> list = found.getProductDetailsList();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null && !list.isEmpty()) details = list.get(0);
            done.run();
        });
    }

    private String price() {
        if (details == null) return null;
        ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
        return offer != null ? offer.getFormattedPrice() : null;
    }

    // What the purchases mean for the game. A bought unlock is acknowledged (Google refunds it after 3 days otherwise).
    private JSObject summary(List<Purchase> purchases) {
        boolean owned = false, pending = false;
        if (purchases != null) {
            for (Purchase p : purchases) {
                if (!p.getProducts().contains(PRODUCT_ID)) continue;
                if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    owned = true;
                    if (!p.isAcknowledged()) {
                        client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), r -> { });
                    }
                } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    pending = true;
                }
            }
        }
        JSObject out = new JSObject();
        out.put("owned", owned);
        out.put("pending", pending);
        out.put("debug", debugBuild());
        String price = price();
        if (price != null) out.put("price", price);
        return out;
    }

    @PluginMethod
    public void status(PluginCall call) {
        connect(call, () -> loadDetails(() -> client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) call.resolve(summary(purchases));
                else call.reject("Could not check purchases (" + result.getResponseCode() + ")");
            })));
    }

    @PluginMethod
    public void restore(PluginCall call) {
        status(call);
    }

    @PluginMethod
    public void buy(PluginCall call) {
        if (buying != null) { call.reject("A purchase is already open"); return; }
        connect(call, () -> loadDetails(() -> {
            if (details == null) { call.reject("The unlock is not set up in Google Play yet"); return; }
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build()))
                .build();
            getActivity().runOnUiThread(() -> {
                buying = call;
                BillingResult result = client.launchBillingFlow(getActivity(), params);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    buying = null;
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { JSObject out = summary(null); out.put("owned", true); call.resolve(out); }
                    else call.reject("Google Play could not start the purchase (" + result.getResponseCode() + ")");
                }
            });
        }));
    }

    // Google Play's purchase sheet has closed (or a slow payment has gone through later).
    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = buying;
        buying = null;
        int code = result.getResponseCode();
        JSObject out = summary(code == BillingClient.BillingResponseCode.OK ? purchases : null);
        if (call == null) {
            // Not from a buy just now (e.g. a pending payment completed): tell the game to look again.
            notifyListeners("purchasesChanged", out);
            return;
        }
        if (code == BillingClient.BillingResponseCode.OK) call.resolve(out);
        else if (code == BillingClient.BillingResponseCode.USER_CANCELED) { out.put("cancelled", true); call.resolve(out); }
        else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { out.put("owned", true); call.resolve(out); }
        else call.reject("Purchase did not finish (" + code + ")");
    }
}
