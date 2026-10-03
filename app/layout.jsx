import './styles.css';
import './thread.css';
import './admin.css';
import './admin-thread.css';
export const metadata={metadataBase:new URL('https://husba.pages.dev'),title:{default:'HUSBA Beads · Handmade jewellery',template:'%s · HUSBA Beads'},description:'Handmade beaded jewellery made to order in Mumbai. Not just a piece. A little part of you.',icons:{icon:'/assets/media/brand/favicon.svg'},manifest:'/manifest.webmanifest'};
export const viewport={themeColor:'#fbf6f2',width:'device-width',initialScale:1};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}
