import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage";
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
        fontFamily: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol','Noto Color Emoji'"
    },
    components: {
        Input: {
            colorPrimary: '#ff583e',
            algorithm: true
        },
        Layout: {
            colorBgLayout: 'transparent',
            siderBg: 'white'      
        },
        Divider: {
            orientationMargin: 0,
            textPaddingInline: 0
        }
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
