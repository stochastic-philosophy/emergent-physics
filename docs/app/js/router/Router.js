export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
    }
    
    init(routes) {
        this.routes = routes;
        
        window.addEventListener('hashchange', this.handleRouteChange.bind(this));
        this.handleRouteChange();
    }
    
    handleRouteChange() {
        const hash = window.location.hash.substring(1);
        const route = hash || '';
        
        console.log(`🧭 Route change: ${route}`);
        
        if (this.routes[route]) {
            this.currentRoute = route;
            this.routes[route]();
        } else {
            const partialMatch = Object.keys(this.routes).find(r => 
                route.startsWith(r) && this.routes[r]
            );
            
            if (partialMatch) {
                this.currentRoute = route;
                this.routes[partialMatch]();
            } else {
                console.warn(`Route not found: ${route}`);
                this.navigate('home');
            }
        }
    }
    
    navigate(route) {
        window.location.hash = route;
    }
    
    getCurrentRoute() {
        return this.currentRoute;
    }
}
