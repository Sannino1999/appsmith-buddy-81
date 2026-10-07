import './globals.css';
import {Sidebar} from '@/components/sidebar';
export const metadata={title:'Perfect Line — Gestionale',description:'Gestionale ASD Perfect Line'};
export default function RootLayout({children}:{children:React.ReactNode}){return <div className="shell"><Sidebar/><main className="main">{children}</main></div>}