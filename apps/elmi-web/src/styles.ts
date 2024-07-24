import { ThemeConfig } from "antd";

export const theme: ThemeConfig = {
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
