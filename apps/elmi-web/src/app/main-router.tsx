import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { SignInPage } from "../features/auth/pages/SignInPage"
import { WorksPage } from "../features/works/pages/WorksPage"
import { SigningEditorPage } from "../features/signing/pages/SigningEditorPage"

const SignedInRoute = () => {
    const isSignedIn: boolean = false
    if(isSignedIn){
        return <Outlet/>
    }else if(isSignedIn == null){
        return <div>Verifying user...</div>
    }else{
        return <Navigate to="/app/login"/>
    }
}

export const MainRouter = () => {
    return <BrowserRouter basename="/">
    <Routes>
        <Route index element={<Navigate to={"app"} />} />
        <Route path="app">
            <Route path="login" element={<SignInPage />} />
            <Route element={<SignedInRoute/>}>
                <Route index element={<Navigate to="works"/>}/>
                <Route path="works">
                    <Route index element={<WorksPage />} />
                    <Route path=":id" element={<SigningEditorPage />} />
                </Route>
            </Route>
            
        </Route>
    </Routes>
</BrowserRouter>
}