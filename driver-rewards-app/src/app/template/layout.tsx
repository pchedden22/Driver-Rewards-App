{/* Change ./Template.module.css to match the page name */}
// import styles from './template.module.css';

{/* Change TemplateLayout to match the page name */}
export default function TemplateLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        
        <div>
            {/* {children} is both the content in page.tsx and any subpages.
                Place HTML before and after it as you wish, but you can only
                return a single HTML element, so keep it within the two div tags. */}
            {children}
        </div>

    );
}
