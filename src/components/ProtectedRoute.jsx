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
        console.log('User role:', user?.role, 'Required role:', requiredRole);
        const userRole = user.role.toUpperCase();
        
        if (userRole !== requiredRole) {
            // Redirect to appropriate dashboard based on role
            if (userRole === 'ROLE_ADMIN') {
                return <Navigate to="/admin" replace />;
            } else {
                return <Navigate to="/" replace />;
            }
        }
    }

    return children;
};