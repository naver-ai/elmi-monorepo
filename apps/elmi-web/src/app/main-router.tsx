import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { SignInPage } from "../features/auth/pages/SignInPage"
import { ProjectsPage } from "../features/projects/pages/ProjectsPage"
import { SigningEditorPage } from "../features/signing/pages/SigningEditorPage"
import { useVerifyToken } from "../features/auth/hooks"
import { useEffect } from "react"
import { useSelector } from "../redux/hooks"
import { UserInfoPage } from "../features/auth/pages/UserInfoPage"

const SignedInRoute = () => {
    const {verify, isSignedIn} = useVerifyToken()

    useEffect(()=>{
        verify().then(isSignedIn => {
            if(!isSignedIn){
                console.log("Should redirect to login")
            }
        })
    }, [verify])

    if(isSignedIn){
        return <Outlet/>
    }else if(isSignedIn == null){
        return <div>Verifying user...</div>
    }else{
        return <Navigate to="/app/login"/>
    }
}

const UserInfoCompleteCheckRouteFrame = () => {
    const user = useSelector(state => state.auth.user)
    if(user?.callable_name == null || user?.sign_language == null){
        return <Navigate to="/app/userinfo"/>
    }else return <Outlet/>
}

export const MainRouter = () => {
    return <BrowserRouter basename="/">
    <Routes>
        <Route index element={<Navigate to={"app"} />} />
        <Route path="app">
            <Route path="login" element={<SignInPage />} />
            <Route element={<SignedInRoute/>}>
                <Route path="userinfo" element={<UserInfoPage/>}/>
                <Route element={<UserInfoCompleteCheckRouteFrame/>}>
                    <Route index element={<Navigate to="projects"/>}/>
                    <Route path="projects">
                        <Route index element={<ProjectsPage />} />
                        <Route path=":id" element={<SigningEditorPage />} />
                    </Route>
                </Route>
            </Route>
            
        </Route>
    </Routes>
</BrowserRouter>
}