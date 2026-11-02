import { AppShell } from '@/app/layout/AppShell';
import React from 'react';
import { WgerRoutes } from "@/routes";


function App() {

    return (
        <AppShell>
            <WgerRoutes />
        </AppShell>
    );
}

export default App;
