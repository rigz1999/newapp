# Finixar - Investment Management Platform
## Complete Tool Presentation & Feature Summary

---

## 🎯 **What is Finixar?**

Finixar is a comprehensive **investment management platform** designed for managing investment projects, investors, subscriptions, coupon payments, and financial tracking. It's a modern web application built for financial institutions, investment firms, and fund managers to streamline their entire investment lifecycle from project creation to payment tracking.

---

## 🏢 **Who is it For?**

### Primary Users:
- **Super Administrators**: Platform-wide control and oversight
- **Organization Administrators**: Manage organization members and settings
- **Team Members**: Day-to-day operations, investor management, payment processing

### Use Cases:
- Investment fund management
- Project-based financing
- Coupon bond management
- Investor relationship management
- Payment tracking and proof validation
- Multi-organization financial operations

---

## 🌟 **Core Features**

### 1. **Multi-Organization Management**
- **Complete tenant isolation**: Each organization has completely separate data
- **Role-based access control**: Super admin, organization admin, and member roles
- **Invitation system**: Secure email-based user invitations with token validation
- **Profile management**: User profiles with full name and email

### 2. **Project Management**
- Create and manage investment projects with detailed information
- Track project financial details (émetteur, représentant de masse)
- Monitor project status and lifecycle
- Link projects to multiple tranches (funding rounds)
- Advanced filtering by émetteur and représentant de masse

### 3. **Tranche Management** (Funding Rounds)
- Create multiple tranches per project
- Define tranche details:
  - Investment amounts and limits
  - Interest rates (taux annuel)
  - Payment frequency (periodicité: mensuelle, trimestrielle, semestrielle, annuelle)
  - Emission and maturity dates
- Automatic coupon schedule generation
- Recalculate coupons when tranche parameters change
- Track tranche performance and subscriptions

### 4. **Investor Management**
- Comprehensive investor profiles with:
  - Personal/company information (nom, raison sociale)
  - Contact details (email, phone, address)
  - SIREN validation (9-digit French company registry)
  - Tax identification (numéro fiscal)
  - CGP (Financial advisor) assignment
  - RIB (bank account) document management
- **RIB Document Upload & Validation**:
  - Secure file upload to Supabase Storage
  - PDF support with automatic parsing
  - IBAN extraction and validation
  - Status tracking (compliant/non-compliant)
- Investor type categorization
- Investment history tracking
- Advanced filtering by type, projects, tranches, CGP, and RIB status

### 5. **Subscription System**
- Track investor subscriptions to specific tranches
- Record investment amounts per subscription
- Link investors to projects and tranches
- Monitor subscription dates and next coupon dates
- **Advanced filtering**:
  - Multi-select projects and tranches
  - Cascading filters (project selection filters available tranches)
  - Date range filtering
  - Investor type filtering

### 6. **Coupon Payment Management**
- Automatic coupon schedule generation (échéancier)
- Track coupon payments with statuses:
  - `en_attente` (pending)
  - `payé` (paid)
  - `en_retard` (late)
- **Payment proof requirement**:
  - Mandatory proof upload for payment validation
  - Support for multiple file formats (PDF, images)
  - Proof preview and download
  - Automatic status update upon proof upload
- Payment reminders and alerts
- Bulk payment processing
- **Advanced filtering**:
  - Filter by status, projects, tranches, CGP
  - Date range for échéance (due dates)
  - Search across investors, projects, tranches

### 7. **Payment Processing Wizard**
- **Step-by-step payment workflow**:
  1. Select project and tranche
  2. Upload payment proof (PDF/images)
  3. Automatic proof analysis and data extraction
  4. Manual data entry or correction
  5. Review and confirm
- **Smart PDF Analysis**:
  - Extracts payment dates
  - Identifies investor names
  - Detects amounts
  - Auto-matches with existing records
- **Batch payment processing**: Process multiple payments from a single proof
- **Quick payment modal**: Fast single-payment entry

### 8. **Document Management**
- **Secure file storage** using Supabase Storage buckets:
  - `payment-proofs`: Permanent payment proof storage
  - `payment-proofs-temp`: Temporary upload staging
  - `ribs`: RIB document storage
- **File validation**:
  - Size limits (configurable via environment variables)
  - Type restrictions (PDF, images)
  - Malware prevention
- **File operations**:
  - Upload with progress tracking
  - Download with signed URLs
  - Preview for images and PDFs
  - Automatic cleanup of temporary files

---

## 🎨 **User Interface & Experience**

### Dashboard
- **Real-time statistics**:
  - Total projects, tranches, investors
  - Total invested capital
  - Active subscriptions
  - Monthly payment summaries
- **Data visualization**:
  - Investment growth charts
  - Monthly subscription trends
  - Payment status distribution
- **Quick actions**: Fast access to common tasks
- **Recent activity**: Latest payments and subscriptions
- **Smart alerts**: Upcoming payments, late payments, RIB compliance issues
- **Global search**: Search across investors, projects, tranches

### Navigation
- **Sidebar navigation** with sections:
  - Dashboard
  - Projects
  - Tranches
  - Investors
  - Subscriptions
  - Payments
  - Échéancier (Coupon schedule)
  - Admin Panel
- **Breadcrumb navigation**: Track your location in the app
- **Responsive design**: Works on desktop, tablet, and mobile

### Advanced Filtering System
- **Multi-select filters**: Select multiple values per field
- **Date range pickers**: Filter by date periods
- **Search functionality**: Text search across multiple fields
- **Filter presets**: Save and load favorite filter combinations
- **Recent filters**: Auto-track last 5 filter combinations
- **Filter analytics**: See which filters you use most
- **Active filter badges**: Visual indication of applied filters
- **Collapsible panels**: Show/hide advanced filters

---

## 🚀 **Advanced Features**

### 1. **Real-time Updates**
- **Live data synchronization** using Supabase Realtime
- **Automatic updates** when data changes in the database
- **Connection status indicators**: Visual feedback for live connection
- **Hooks for all major tables**:
  - `useRealtimePayments()`
  - `useRealtimeInvestors()`
  - `useRealtimeProjects()`
  - `useRealtimeSubscriptions()`
- **Configurable**: Can be disabled globally or per-component

### 2. **Export Functionality**
- **Excel export** (XLSX format):
  - Investors list
  - Payment records
  - Coupon schedules
  - Subscription data
- **PDF export**: Documents and reports
- **Filtered exports**: Export respects active filters
- **Dynamic imports**: Heavy libraries loaded only when needed (performance optimization)

### 3. **Data Import**
- **Registre import**: Bulk import of investor registry data
- **Excel file processing**: Parse and validate spreadsheet data
- **Error handling**: Detailed validation and error reporting

### 4. **Security & Validation**

#### Input Validation:
- **Financial data**:
  - Amount validation (positive numbers only)
  - Decimal precision handling using Decimal.js
- **Personal data**:
  - SIREN validation (9-digit + Luhn checksum)
  - IBAN validation
  - Email format validation
  - Phone number validation
- **Date validation**:
  - Logical date ranges (emission < échéance)
  - Prevent past dates where inappropriate

#### Security Measures:
- **Row-Level Security (RLS)**: Database-level access control
- **Organization isolation**: Users only see their organization's data
- **Authentication**: Supabase Auth with email/password
- **Authorization**: Role-based permissions
- **Input sanitization**: DOMPurify for HTML content
- **XSS prevention**: Sanitized user inputs
- **SQL injection protection**: Parameterized queries via Supabase
- **Secure file uploads**: Type and size validation
- **HTTPS-only**: All connections encrypted

### 5. **Performance Optimizations**

#### Code Splitting & Lazy Loading:
- **Dynamic imports** for heavy libraries (PDF.js, ExcelJS, jsPDF)
- **Reduced initial bundle**: -523 KB from initial load
- **Faster page loads**: 3-5x faster for users who don't export data

#### Database Optimizations:
- **Indexed queries**: Performance indexes on frequently queried columns
- **Optimized RLS policies**: Efficient permission checks
- **Query consolidation**: Eliminated duplicate queries
- **Batch operations**: Bulk updates where possible

#### UI Performance:
- **useMemo hooks**: Prevent unnecessary recalculations
- **useCallback**: Memoized event handlers
- **Efficient re-renders**: Optimized React component updates
- **Pagination**: Limit displayed data for large lists

### 6. **Error Handling**

#### User-Friendly Errors:
- **Contextual error messages**: Clear, actionable feedback
- **Error message utility**: Translates technical errors to French user messages
- **Toast notifications**: Non-intrusive error and success messages
- **Validation feedback**: Real-time form validation

#### Developer Tools:
- **Structured logging**: Custom logger utility
- **Sentry integration**: Automatic error reporting in production
- **Development mode**: Detailed console logs for debugging
- **Production mode**: Clean console, errors sent to Sentry

---

## 🛠️ **Technical Architecture**

### Frontend Stack
- **React 18.3**: Modern React with hooks and concurrent features
- **TypeScript 5.5**: Full type safety
- **Vite 7.2**: Lightning-fast build tool
- **React Router DOM 7.9**: Client-side routing
- **Tailwind CSS 3.4**: Utility-first styling
- **Lucide React**: Beautiful icon library

### Backend Services
- **Supabase**: Complete backend-as-a-service
  - **PostgreSQL**: Relational database
  - **Supabase Auth**: User authentication
  - **Supabase Storage**: File storage
  - **Supabase Realtime**: Live data subscriptions
  - **Edge Functions**: Serverless functions (11 functions)

### Data Processing
- **ExcelJS**: Excel file generation and parsing
- **jsPDF + autotable**: PDF generation
- **PDF.js**: PDF parsing and text extraction
- **Decimal.js**: Precise decimal calculations
- **DOMPurify**: HTML sanitization

### Quality Assurance
- **Vitest**: Fast unit testing framework
- **Testing Library**: React component testing
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **TypeScript**: Compile-time type checking
- **Husky**: Git hooks for pre-commit checks
- **Lint-staged**: Run linters on staged files

### Monitoring & Analytics
- **Sentry**: Error tracking and performance monitoring
- **Web Vitals**: Core Web Vitals tracking
- **Custom analytics**: Filter usage tracking

---

## 📊 **Database Schema**

### Core Tables

#### **organizations**
- Multi-tenant organization structure
- Isolates data per organization

#### **memberships**
- Links users to organizations
- Stores roles (admin, member)

#### **profiles**
- User profile information
- Email, full name, timestamps

#### **invitations**
- Email-based user invitations
- Token-based security
- Expiration tracking
- Status management (pending, accepted, expired)

#### **projets** (Projects)
- Investment project details
- Émetteur (issuer) information
- Représentant de masse
- Organization relationship

#### **tranches** (Funding Rounds)
- Links to projects
- Investment parameters (amount, rate, frequency)
- Emission and maturity dates
- Organization relationship

#### **investisseurs** (Investors)
- Investor profiles (personal/company)
- Contact information
- SIREN, tax ID, CGP
- RIB document references
- Organization relationship

#### **souscriptions** (Subscriptions)
- Links investors to tranches
- Investment amounts
- Subscription dates
- Next coupon dates
- Organization relationship

#### **paiements** (Payments/Coupons)
- Coupon payment tracking
- Payment status and dates
- Proof document references
- Links to subscriptions and tranches
- Organization relationship

#### **user_reminder_settings**
- User notification preferences
- Email reminder settings

### Storage Buckets
- **payment-proofs**: Permanent payment proof storage
- **payment-proofs-temp**: Temporary upload area
- **ribs**: RIB document storage

### Security Features
- **Row-Level Security (RLS)** on all tables
- **Organization-based data isolation**
- **Role-based access policies**
- **Secure deletion cascades**

---

## 🔧 **Configuration & Customization**

### Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Storage Buckets
VITE_STORAGE_BUCKET_PAYMENT_PROOFS=payment-proofs
VITE_STORAGE_BUCKET_PAYMENT_PROOFS_TEMP=payment-proofs-temp
VITE_STORAGE_BUCKET_RIBS=ribs

# File Upload Limits (MB)
VITE_MAX_FILE_SIZE_DOCUMENTS=10
VITE_MAX_FILE_SIZE_IMAGES=5
VITE_MAX_FILE_SIZE_RIB=5

# Pagination
VITE_ITEMS_PER_PAGE=25

# Feature Flags
VITE_ENABLE_REALTIME_UPDATES=true
VITE_ENABLE_ADVANCED_FILTERS=true

# Monitoring
VITE_SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_ENVIRONMENT=production
```

### Customization Points
- **Items per page**: Configurable pagination
- **File size limits**: Adjustable per file type
- **Feature flags**: Enable/disable features
- **Theme**: Tailwind CSS configuration
- **Roles**: Extendable role system

---

## 📱 **Supabase Edge Functions**

### Available Functions:

1. **accept-invitation**: Process invitation acceptances
2. **analyze-payment**: Analyze single payment proof
3. **analyze-payment-batch**: Batch payment proof analysis
4. **change-password**: User password management
5. **create-admin**: Create super administrator
6. **delete-pending-user**: Clean up pending users
7. **import-registre**: Bulk import investor registry
8. **regenerate-echeancier**: Rebuild coupon schedules
9. **send-coupon-reminders**: Automated payment reminders
10. **send-invitation**: Send user invitation emails

---

## 🎓 **Custom React Hooks**

### Authentication & Organization
- **useAuth**: User authentication state and methods
- **useOrganization**: Current organization context

### Data Management
- **useRealtimeData**: Real-time data subscriptions
- **useRealtimeSubscription**: Generic realtime hook
- **useRetryableQuery**: Automatic retry for failed queries

### Filtering & UI
- **useAdvancedFilters**: Complete filtering system with presets
- **usePagination**: Pagination logic
- **useDebounce**: Debounced values for search
- **useKeyboardShortcuts**: Keyboard navigation

---

## 🧩 **Reusable Components**

### Layout Components
- **Layout**: Main application layout with sidebar
- **Sidebar**: Navigation menu
- **Breadcrumbs**: Navigation trail

### Filter Components
- **MultiSelectFilter**: Multi-select dropdown with tags
- **DateRangePicker**: Start/end date selector
- **FilterPresets**: Save/load filter combinations
- **RecentFilters**: Display recent filters and analytics

### Common Components
- **Pagination**: Page navigation
- **Skeleton**: Loading placeholders
- **Tooltip**: Hover information
- **ConfirmDialog**: Confirmation modals
- **LiveIndicator**: Real-time connection status

### Domain Components
- **FileUpload**: Secure file upload
- **PaymentProofUpload**: Payment proof handling
- **ViewProofsModal**: Proof preview
- **GlobalSearch**: Cross-entity search

---

## 📈 **Workflow Examples**

### Creating a New Investment Project
1. Navigate to Projects
2. Click "Nouveau projet"
3. Enter project details (name, émetteur, représentant)
4. Save project
5. Create tranches for the project

### Adding Investors
1. Navigate to Investors
2. Click "Nouvel investisseur"
3. Enter personal/company information
4. Upload RIB document (optional)
5. Assign CGP (optional)
6. Save investor profile

### Recording Subscriptions
1. Navigate to Subscriptions
2. Click "Nouvelle souscription"
3. Select investor
4. Select project and tranche
5. Enter investment amount
6. Set subscription date
7. System automatically generates coupon schedule

### Processing Payments
1. Navigate to Payments or use Payment Wizard
2. Select payment method:
   - **Quick payment**: Single payment entry
   - **Payment wizard**: Upload proof and auto-extract data
3. Upload payment proof (if using wizard)
4. System analyzes proof and extracts data
5. Review and confirm payment details
6. Submit payment
7. System updates coupon status to "payé"

### Managing Coupon Schedule (Échéancier)
1. Navigate to Échéancier
2. View upcoming and past coupons
3. Filter by status, project, tranche, dates
4. Click on coupon to view details
5. Upload payment proof if not paid
6. System updates status automatically

---

## 📊 **Reports & Analytics**

### Dashboard Statistics
- Total capital invested
- Number of active projects
- Number of investors
- Number of subscriptions
- Monthly payment summaries
- Investment growth over time

### Filter Analytics
- Track which filters are used most
- Usage counts per field
- Recently used filter combinations
- Help users discover useful filters

### Export Capabilities
- Filtered data exports (Excel/PDF)
- Custom date ranges
- Investor lists with all details
- Payment histories
- Coupon schedules

---

## 🔐 **Access Control**

### Role Hierarchy
1. **Super Admin**:
   - Platform-wide access
   - Manage all organizations
   - Create organization admins

2. **Organization Admin**:
   - Full access within organization
   - Manage organization members
   - Invite new users
   - Configure settings

3. **Member**:
   - View and edit data within organization
   - Cannot manage users
   - Cannot change settings

### Permission Matrix
| Feature | Member | Org Admin | Super Admin |
|---------|--------|-----------|-------------|
| View data | ✅ | ✅ | ✅ |
| Create/Edit data | ✅ | ✅ | ✅ |
| Delete data | ❌ | ✅ | ✅ |
| Manage members | ❌ | ✅ | ✅ |
| Invite users | ❌ | ✅ | ✅ |
| Manage organizations | ❌ | ❌ | ✅ |

---

## 🚀 **Getting Started**

### Prerequisites
- Node.js v18.x or higher (recommended: v20.x)
- npm v9.x or higher
- Supabase account
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd newapp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm test` - Run tests
- `npm run test:ui` - Interactive test UI

---

## 🎯 **Key Differentiators**

### What Makes Finixar Unique?

1. **Multi-Organization Support**: True multi-tenancy with complete data isolation
2. **Comprehensive Coupon Management**: Automatic schedule generation and tracking
3. **Smart Payment Processing**: AI-powered PDF analysis and data extraction
4. **Advanced Filtering**: Save presets, track usage, cascading filters
5. **Real-time Collaboration**: Live updates across all users
6. **RIB Document Management**: Secure upload, validation, and compliance tracking
7. **French Financial Compliance**: SIREN, IBAN validation, French terminology
8. **Performance Optimized**: Code splitting, lazy loading, efficient queries
9. **Type-Safe**: Full TypeScript coverage
10. **Production-Ready**: Error tracking, monitoring, security hardened

---

## 📚 **Documentation**

### Available Documentation Files
- `README.md` - Setup and getting started
- `FEATURES.md` - Feature documentation
- `FEATURES_IMPLEMENTED.md` - Advanced filtering details
- `SECURITY.md` - Security policy and measures
- `PERFORMANCE_IMPROVEMENTS_COMPLETE.md` - Performance optimizations
- `CRITICAL_IMPROVEMENTS_COMPLETED.md` - Quality improvements
- `DATABASE_INDEXES.md` - Database optimization
- `TEST_REPORT.md` - Testing documentation

---

## 🔮 **Future Enhancements**

### Potential Roadmap Items
- Two-factor authentication (2FA)
- Advanced reporting and custom templates
- Mobile app (React Native)
- API for third-party integrations
- Automated payment reconciliation
- Machine learning for payment prediction
- Multi-language support
- Dark mode
- Advanced analytics dashboard
- Audit trail and compliance reporting

---

## 💡 **Summary**

**Finixar** is a **production-ready, enterprise-grade investment management platform** that provides:

✅ **Complete investment lifecycle management** (projects → tranches → investors → subscriptions → payments)
✅ **Multi-organization support** with secure data isolation
✅ **Advanced filtering and search** across all entities
✅ **Real-time collaboration** with live data updates
✅ **Smart automation** (coupon schedules, payment analysis, reminders)
✅ **Secure document management** (RIBs, payment proofs)
✅ **French financial compliance** (SIREN, IBAN validation)
✅ **Modern tech stack** (React, TypeScript, Supabase)
✅ **Performance optimized** (lazy loading, code splitting)
✅ **Production monitoring** (Sentry, error tracking)
✅ **Type-safe and tested** (TypeScript, Vitest)

**Built for:** Investment firms, fund managers, financial institutions managing project-based investments and coupon payments.

---

## 📞 **Support & Contact**

- **Support Email**: support@finixar.com
- **Security Issues**: security@finixar.com
- **GitHub Issues**: [Repository Issues]

---

**Version**: 0.0.0
**Last Updated**: November 2025
**License**: [Add your license]
**Built with**: ❤️ by the Finixar team
