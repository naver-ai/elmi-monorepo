import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WorksPage } from "../features/works/pages/WorksPage";
import { SigningEditorPage } from "../features/signing/pages/SigningEditorPage";
import { Provider } from "react-redux";
import { persistor, store } from "../redux/store";
import { PersistGate } from "redux-persist/integration/react";
import { SignInPage } from "../features/auth/pages/SignInPage";


export function App() {

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <BrowserRouter basename="/app">
          <Routes>
            <Route path=""/>
            <Route path="signin" element={<SignInPage/>}/>
            <Route path="works">
                <Route path="list" element={<WorksPage/>}/>
                <Route path=":id" element={<SigningEditorPage/>}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </PersistGate>
    </Provider>
    )
}

export default App;
