import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // Redirect them to the /login page
        return <Navigate to="/login" />;
    }

    // If a role is required and user doesn't have it
    if (requiredRole && user?.role) {
        console.log('Auth Debug - User:', user);
        console.log('Auth Debug - User role:', user?.role, 'Required role:', requiredRole);
        console.log('Auth Debug - isAuthenticated:', isAuthenticated);
        
        const userRole = user.role.toUpperCase();
        const normalizedUserRole = userRole.startsWith('ROLE_') ? userRole : `ROLE_${userRole}`;
        const normalizedRequiredRole = requiredRole.startsWith('ROLE_') ? requiredRole : `ROLE_${requiredRole}`;
        
        console.log('Auth Debug - Normalized roles:', { normalizedUserRole, normalizedRequiredRole });
        
        if (normalizedUserRole !== normalizedRequiredRole) {
            console.log('Auth Debug - Role mismatch');
            // Redirect to appropriate dashboard based on role
            if (normalizedUserRole === 'ROLE_ADMIN') {
                console.log('Auth Debug - Redirecting to admin');
                return <Navigate to="/admin" replace />;
            } else {
                console.log('Auth Debug - Redirecting to home');
                return <Navigate to="/" replace />;
            }
        }
    } else {
        console.log('Auth Debug - Missing role check:', { 
            requiredRole: !!requiredRole,
            hasUser: !!user,
            hasRole: !!(user?.role),
            role: user?.role
        });
    }

    return children;
};