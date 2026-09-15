package com.leolimacr.financaspro;

import android.os.Bundle;
import android.graphics.Color;
import android.view.Window;

import androidx.annotation.Nullable;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int STATUS_BAR_COLOR = Color.rgb(238, 242, 245);

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        registerPlugin(AgendaShortcutPlugin.class);
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(STATUS_BAR_COLOR);

        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
    }
}
