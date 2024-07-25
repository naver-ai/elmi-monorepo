import { Provider } from "react-redux";
import { persistor, store } from "../redux/store";
import { PersistGate } from "redux-persist/integration/react";
import { MainRouter } from "./main-router";
import { ConfigProvider } from "antd";
import { theme } from "../styles";

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
