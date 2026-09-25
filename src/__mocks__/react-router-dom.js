import React from 'react';

export const useNavigate = () => jest.fn();
export const useLocation = () => ({ state: null, pathname: '/' });
export const useParams = () => ({ id: 'test-id' });
export const Navigate = ({ to }) => <div data-testid="mock-navigate" data-to={to}>Navigating to {to}</div>;
export const Outlet = () => <div data-testid="mock-outlet">Outlet Content</div>;
export const BrowserRouter = ({ children }) => <div>{children}</div>;
export const Routes = ({ children }) => <div>{children}</div>;
export const Route = ({ element }) => <div>{element}</div>;
