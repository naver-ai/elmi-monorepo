import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { WorksPage } from "../features/works/pages/WorksPage";
import { SigningEditorPage } from "../features/signing/pages/SigningEditorPage";
import { Provider } from "react-redux";
import { persistor, store } from "../redux/store";
import { PersistGate } from "redux-persist/integration/react";
import { SignInPage } from "../features/auth/pages/SignInPage";
import { MainRouter } from "./main-router";
import { ConfigProvider, ThemeConfig } from "antd";

const theme: ThemeConfig = {
    token: {
        colorPrimary: "#303030",
        borderRadius: 100
    }
}

export function App() {

    return (
        <ConfigProvider theme={theme}>
            <Provider store={store}>
                <PersistGate persistor={persistor}>
                    <MainRouter/>
                </PersistGate>
            </Provider>
        </ConfigProvider>
    )
}

export default App;
