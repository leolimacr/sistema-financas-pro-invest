package com.leolimacr.financaspro;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AgendaShortcut")
public class AgendaShortcutPlugin extends Plugin {

    @PluginMethod
    public void isPinSupported(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = getContext();
            ShortcutManager shortcutManager = context.getSystemService(ShortcutManager.class);
            ret.put("supported", shortcutManager != null && shortcutManager.isRequestPinShortcutSupported());
        } else {
            ret.put("supported", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void pinAgendaShortcut(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("A criação de atalho na tela inicial requer Android 8.0 ou superior.");
            return;
        }

        Context context = getContext();
        ShortcutManager shortcutManager = context.getSystemService(ShortcutManager.class);

        if (shortcutManager == null || !shortcutManager.isRequestPinShortcutSupported()) {
            call.reject("O seu inicializador de tela inicial não suporta fixação direta de atalhos.");
            return;
        }

        try {
            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("financaspro://agenda"));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            android.graphics.Bitmap iconBitmap = android.graphics.BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_shortcut_agenda);
            Icon shortcutIcon;
            if (iconBitmap != null) {
                shortcutIcon = Icon.createWithAdaptiveBitmap(iconBitmap);
            } else {
                shortcutIcon = Icon.createWithResource(context, R.drawable.ic_shortcut_agenda);
            }

            ShortcutInfo pinShortcutInfo = new ShortcutInfo.Builder(context, "agenda_pinned_shortcut")
                    .setIcon(shortcutIcon)
                    .setShortLabel("Agenda")
                    .setLongLabel("Agenda Finanças Pro Invest")
                    .setIntent(intent)
                    .build();

            Intent pinnedShortcutCallbackIntent = shortcutManager.createShortcutResultIntent(pinShortcutInfo);
            PendingIntent successCallback = PendingIntent.getBroadcast(
                    context,
                    0,
                    pinnedShortcutCallbackIntent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            boolean requested = shortcutManager.requestPinShortcut(pinShortcutInfo, successCallback.getIntentSender());

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("requested", requested);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao solicitar atalho na tela inicial: " + e.getMessage(), e);
        }
    }
}
