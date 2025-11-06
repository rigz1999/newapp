#!/bin/bash

# Script to update component import paths after reorganization

# Common components
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './AlertModal'|from './common/AlertModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../AlertModal'|from '../common/AlertModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/AlertModal'|from './components/common/AlertModal'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './EmptyState'|from './common/EmptyState'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../EmptyState'|from '../common/EmptyState'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/EmptyState'|from './components/common/EmptyState'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './ErrorBoundary'|from './common/ErrorBoundary'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../ErrorBoundary'|from '../common/ErrorBoundary'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/ErrorBoundary'|from './components/common/ErrorBoundary'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './ErrorMessage'|from './common/ErrorMessage'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../ErrorMessage'|from '../common/ErrorMessage'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/ErrorMessage'|from './components/common/ErrorMessage'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Modals'|from './common/Modals'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Modals'|from '../common/Modals'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Modals'|from './components/common/Modals'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Pagination'|from './common/Pagination'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Pagination'|from '../common/Pagination'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Pagination'|from './components/common/Pagination'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Skeleton'|from './common/Skeleton'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Skeleton'|from '../common/Skeleton'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Skeleton'|from './components/common/Skeleton'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Spinner'|from './common/Spinner'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Spinner'|from '../common/Spinner'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Spinner'|from './components/common/Spinner'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Toast'|from './common/Toast'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Toast'|from '../common/Toast'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Toast'|from './components/common/Toast'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './ValidatedInput'|from './common/ValidatedInput'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../ValidatedInput'|from '../common/ValidatedInput'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/ValidatedInput'|from './components/common/ValidatedInput'|g" {} \;

# Layouts
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Layout'|from './layouts/Layout'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Layout'|from '../layouts/Layout'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Layout'|from './components/layouts/Layout'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Sidebar'|from './layouts/Sidebar'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Sidebar'|from '../layouts/Sidebar'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Sidebar'|from './components/layouts/Sidebar'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Breadcrumbs'|from './layouts/Breadcrumbs'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Breadcrumbs'|from '../layouts/Breadcrumbs'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Breadcrumbs'|from './components/layouts/Breadcrumbs'|g" {} \;

# Auth
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Login'|from './auth/Login'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Login'|from '../auth/Login'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Login'|from './components/auth/Login'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './InvitationAccept'|from './auth/InvitationAccept'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../InvitationAccept'|from '../auth/InvitationAccept'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/InvitationAccept'|from './components/auth/InvitationAccept'|g" {} \;

# Dashboard
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Dashboard'|from './dashboard/Dashboard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Dashboard'|from '../dashboard/Dashboard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Dashboard'|from './components/dashboard/Dashboard'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './GlobalSearch'|from './dashboard/GlobalSearch'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../GlobalSearch'|from '../dashboard/GlobalSearch'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/GlobalSearch'|from './components/dashboard/GlobalSearch'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './LiveIndicator'|from './dashboard/LiveIndicator'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../LiveIndicator'|from '../dashboard/LiveIndicator'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/LiveIndicator'|from './components/dashboard/LiveIndicator'|g" {} \;

# Projects
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Projects'|from './projects/Projects'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Projects'|from '../projects/Projects'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Projects'|from './components/projects/Projects'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './ProjectDetail'|from './projects/ProjectDetail'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../ProjectDetail'|from '../projects/ProjectDetail'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/ProjectDetail'|from './components/projects/ProjectDetail'|g" {} \;

# Investors
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Investors'|from './investors/Investors'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Investors'|from '../investors/Investors'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Investors'|from './components/investors/Investors'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './FileUpload'|from './investors/FileUpload'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../FileUpload'|from '../investors/FileUpload'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/FileUpload'|from './components/investors/FileUpload'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './ViewProofsModal'|from './investors/ViewProofsModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../ViewProofsModal'|from '../investors/ViewProofsModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/ViewProofsModal'|from './components/investors/ViewProofsModal'|g" {} \;

# Payments
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Payments'|from './payments/Payments'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Payments'|from '../payments/Payments'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Payments'|from './components/payments/Payments'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './PaymentsModal'|from './payments/PaymentsModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../PaymentsModal'|from '../payments/PaymentsModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/PaymentsModal'|from './components/payments/PaymentsModal'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './PaymentWizard'|from './payments/PaymentWizard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../PaymentWizard'|from '../payments/PaymentWizard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/PaymentWizard'|from './components/payments/PaymentWizard'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './PaymentProofUpload'|from './payments/PaymentProofUpload'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../PaymentProofUpload'|from '../payments/PaymentProofUpload'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/PaymentProofUpload'|from './components/payments/PaymentProofUpload'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './QuickPaymentModal'|from './payments/QuickPaymentModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../QuickPaymentModal'|from '../payments/QuickPaymentModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/QuickPaymentModal'|from './components/payments/QuickPaymentModal'|g" {} \;

# Subscriptions
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Subscriptions'|from './subscriptions/Subscriptions'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Subscriptions'|from '../subscriptions/Subscriptions'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Subscriptions'|from './components/subscriptions/Subscriptions'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './SubscriptionsModal'|from './subscriptions/SubscriptionsModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../SubscriptionsModal'|from '../subscriptions/SubscriptionsModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/SubscriptionsModal'|from './components/subscriptions/SubscriptionsModal'|g" {} \;

# Tranches
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Tranches'|from './tranches/Tranches'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Tranches'|from '../tranches/Tranches'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Tranches'|from './components/tranches/Tranches'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './TranchesModal'|from './tranches/TranchesModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../TranchesModal'|from '../tranches/TranchesModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/TranchesModal'|from './components/tranches/TranchesModal'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './TrancheWizard'|from './tranches/TrancheWizard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../TrancheWizard'|from '../tranches/TrancheWizard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/TrancheWizard'|from './components/tranches/TrancheWizard'|g" {} \;

# Coupons
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Coupons'|from './coupons/Coupons'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Coupons'|from '../coupons/Coupons'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Coupons'|from './components/coupons/Coupons'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './EcheancierCard'|from './coupons/EcheancierCard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../EcheancierCard'|from '../coupons/EcheancierCard'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/EcheancierCard'|from './components/coupons/EcheancierCard'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './EcheancierModal'|from './coupons/EcheancierModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../EcheancierModal'|from '../coupons/EcheancierModal'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/EcheancierModal'|from './components/coupons/EcheancierModal'|g" {} \;

# Admin
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './AdminPanel'|from './admin/AdminPanel'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../AdminPanel'|from '../admin/AdminPanel'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/AdminPanel'|from './components/admin/AdminPanel'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Members'|from './admin/Members'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Members'|from '../admin/Members'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Members'|from './components/admin/Members'|g" {} \;

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './Settings'|from './admin/Settings'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from '../Settings'|from '../admin/Settings'|g" {} \;
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|from './components/Settings'|from './components/admin/Settings'|g" {} \;

echo "✅ Import paths updated successfully!"
