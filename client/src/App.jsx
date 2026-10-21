import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout.jsx';
import PartnerLayout from './components/layout/PartnerLayout.jsx';
import HomePage, { RestaurantsPage, RestaurantPage } from './pages/MarketplacePage.jsx';
import PartnerPage, { PlatformRestaurantsPage } from './pages/PartnerPage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DishPage from './pages/DishPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import { OrderConfirmationPage, OrderTrackingPage } from './pages/OrderPages.jsx';
import ReservationConfirmationPage from './pages/ReservationConfirmationPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordRecoveryPage.jsx';
import {
  CancellationRefundPage,
  DeliveryPolicyPage,
  GrievancePage,
  LegalCentrePage,
  PrivacyPage,
  TermsPage,
} from './pages/LegalPages.jsx';
import RequireAccount from './components/RequireAccount.jsx';

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <RequireAccount>
            <PartnerLayout />
          </RequireAccount>
        }
      >
        <Route path="partner" element={<PartnerPage />} />
      </Route>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="restaurants" element={<RestaurantsPage />} />
        <Route path="restaurants/:id" element={<RestaurantPage />} />
        <Route
          path="platform/restaurants"
          element={
            <RequireAccount admin>
              <PlatformRestaurantsPage />
            </RequireAccount>
          }
        />
        <Route path="menu" element={<MenuPage />} />
        <Route path="menu/:id" element={<DishPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<AuthPage key="login" />} />
        <Route path="register" element={<AuthPage key="register" register />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route
          path="checkout"
          element={
            <RequireAccount>
              <CheckoutPage />
            </RequireAccount>
          }
        />
        <Route
          path="payment"
          element={
            <RequireAccount>
              <PaymentPage />
            </RequireAccount>
          }
        />
        <Route
          path="orders/:id/confirmation"
          element={
            <RequireAccount>
              <OrderConfirmationPage />
            </RequireAccount>
          }
        />
        <Route
          path="orders/:id/tracking"
          element={
            <RequireAccount>
              <OrderTrackingPage />
            </RequireAccount>
          }
        />
        <Route
          path="reservations/:id"
          element={
            <RequireAccount>
              <ReservationConfirmationPage />
            </RequireAccount>
          }
        />
        <Route
          path="account"
          element={
            <RequireAccount>
              <AccountPage />
            </RequireAccount>
          }
        />
        <Route
          path="account/:section"
          element={
            <RequireAccount>
              <AccountPage />
            </RequireAccount>
          }
        />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="legal" element={<LegalCentrePage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="cancellation-refunds" element={<CancellationRefundPage />} />
        <Route path="delivery-policy" element={<DeliveryPolicyPage />} />
        <Route path="grievance" element={<GrievancePage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="admin"
        element={
          <RequireAccount admin>
            <AdminPage />
          </RequireAccount>
        }
      />
    </Routes>
  );
}
