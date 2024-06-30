import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WorksPage } from "../features/works/pages/WorksPage";
import { SigningEditorPage } from "../features/signing/pages/SigningEditorPage";


export function App() {

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path=""/>
        <Route path="works">
            <Route path="list" element={<WorksPage/>}/>
            <Route path=":id" element={<SigningEditorPage/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
    )
}

export default App;
