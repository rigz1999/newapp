# New Features Documentation

This document explains the new features added to the application: Environment Variables, Advanced Filtering, and Real-time Updates.

---

## 📋 Table of Contents

1. [Environment Variables (Config System)](#1-environment-variables)
2. [Advanced Filtering](#2-advanced-filtering)
3. [Real-time Updates](#3-real-time-updates)
4. [Usage Examples](#4-usage-examples)

---

## 1. Environment Variables

### Overview
Centralized configuration system using environment variables for easy customization without code changes.

### Files Created
- `.env.example` - Example environment file
- `src/config/index.ts` - Configuration utility
- `src/hooks/usePagination.ts` - Pagination hook using config

### Configuration Options

Create a `.env` file in the root directory with these values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Storage Configuration
VITE_STORAGE_BUCKET_PAYMENT_PROOFS=payment-proofs
VITE_STORAGE_BUCKET_PAYMENT_PROOFS_TEMP=payment-proofs-temp
VITE_STORAGE_BUCKET_RIBS=ribs

# File Upload Limits (in MB)
VITE_MAX_FILE_SIZE_DOCUMENTS=10
VITE_MAX_FILE_SIZE_IMAGES=5
VITE_MAX_FILE_SIZE_RIB=5

# Pagination
VITE_ITEMS_PER_PAGE=25

# Feature Flags
VITE_ENABLE_REALTIME_UPDATES=true
VITE_ENABLE_ADVANCED_FILTERS=true
```

### Usage in Code

```typescript
import { config, fileUpload, pagination, features } from './config';

// Access configuration values
const maxSize = fileUpload.maxSizeDocuments; // 10
const itemsPerPage = pagination.itemsPerPage; // 25
const isRealtimeEnabled = features.enableRealtimeUpdates; // true
```

### Benefits
- ✅ Change configuration without modifying code
- ✅ Different settings for development/production
- ✅ Type-safe access with fallback defaults
- ✅ Easy to manage across environments

---

## 2. Advanced Filtering

### Overview
Powerful filtering system with date ranges, multi-select options, search, and saveable filter presets.

### Files Created
- `src/hooks/useAdvancedFilters.ts` - Core filtering hook
- `src/components/filters/DateRangePicker.tsx` - Date range component
- `src/components/filters/MultiSelectFilter.tsx` - Multi-select component
- `src/components/filters/FilterPresets.tsx` - Saved presets component

### Features
- 📅 Date range filtering
- 🎯 Multi-select filters (multiple values per field)
- 🔍 Text search across multiple fields
- 💾 Save and load filter presets
- 🔄 LocalStorage persistence

### Basic Usage

```typescript
import { useAdvancedFilters } from './hooks/useAdvancedFilters';

function MyComponent() {
  const {
    filters,
    setSearch,
    setDateRange,
    addMultiSelectFilter,
    clearAllFilters,
    applyFilters,
    savePreset,
    presets,
  } = useAdvancedFilters({
    persistKey: 'my-component-filters', // localStorage key
  });

  // Apply filters to your data
  const filteredData = applyFilters(rawData, {
    searchFields: ['nom', 'email'], // Fields to search in
    dateField: 'created_at', // Field for date filtering
  });

  return (
    <div>
      {/* Search */}
      <input
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
      />

      {/* Date Range */}
      <DateRangePicker
        startDate={filters.dateRange.startDate}
        endDate={filters.dateRange.endDate}
        onStartDateChange={(date) => setDateRange(date, filters.dateRange.endDate)}
        onEndDateChange={(date) => setDateRange(filters.dateRange.startDate, date)}
      />

      {/* Multi-select */}
      <MultiSelectFilter
        label="Statut"
        options={[
          { value: 'active', label: 'Actif' },
          { value: 'inactive', label: 'Inactif' },
        ]}
        selectedValues={
          filters.multiSelect.find(f => f.field === 'status')?.values || []
        }
        onAdd={(value) => addMultiSelectFilter('status', value)}
        onRemove={(value) => removeMultiSelectFilter('status', value)}
        onClear={() => clearMultiSelectFilter('status')}
      />

      {/* Clear all */}
      <button onClick={clearAllFilters}>Tout effacer</button>

      {/* Save current filters */}
      <button onClick={() => savePreset('Mon filtre favori')}>
        Sauvegarder
      </button>

      {/* Display filtered data */}
      {filteredData.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
}
```

### Filter Presets

Filter presets allow users to save their commonly-used filter combinations:

```typescript
import { FilterPresets } from './components/filters/FilterPresets';

<FilterPresets
  presets={presets}
  onSave={(name) => savePreset(name)}
  onLoad={(id) => loadPreset(id)}
  onDelete={(id) => deletePreset(id)}
/>
```

---

## 3. Real-time Updates

### Overview
Automatic data synchronization using Supabase real-time subscriptions. Data updates automatically when changes occur in the database.

### Files Created
- `src/hooks/useRealtimeSubscription.ts` - Generic realtime hook
- `src/hooks/useRealtimeData.ts` - Specific hooks for tables
- `src/components/LiveIndicator.tsx` - Visual status indicator

### Available Hooks

#### Generic Hook
```typescript
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription';

const { isConnected, lastUpdate } = useRealtimeSubscription({
  table: 'paiements',
  event: 'INSERT', // 'INSERT', 'UPDATE', 'DELETE', or '*'
  filter: 'project_id=eq.123', // Optional filter
  onInsert: (payload) => console.log('New record:', payload.new),
  onUpdate: (payload) => console.log('Updated:', payload.new),
  onDelete: (payload) => console.log('Deleted:', payload.old),
});
```

#### Specific Table Hooks

**Payments:**
```typescript
import { useRealtimePayments } from './hooks/useRealtimeData';

const {
  data,
  loading,
  isLive,
  lastUpdate,
  refresh
} = useRealtimePayments();

// Data auto-updates when database changes!
```

**Investors:**
```typescript
import { useRealtimeInvestors } from './hooks/useRealtimeData';

const { data, isLive, refresh } = useRealtimeInvestors({
  onDataChange: (newData) => {
    console.log('Investors updated!', newData);
  }
});
```

**Projects:**
```typescript
import { useRealtimeProjects } from './hooks/useRealtimeData';
const { data, isLive } = useRealtimeProjects();
```

**Subscriptions:**
```typescript
import { useRealtimeSubscriptions } from './hooks/useRealtimeData';
const { data, isLive } = useRealtimeSubscriptions();
```

### Visual Indicators

Show users when data is live and when it was last updated:

```typescript
import { LiveIndicator } from './components/LiveIndicator';

<LiveIndicator
  isLive={isLive}
  lastUpdate={lastUpdate}
  onRefresh={refresh}
/>

// Or use compact dot:
import { LiveDot } from './components/LiveIndicator';

<LiveDot isLive={isLive} />
```

### Disable Realtime

To disable realtime updates globally, set in `.env`:

```env
VITE_ENABLE_REALTIME_UPDATES=false
```

Or disable per component:

```typescript
const { data } = useRealtimePayments({ enabled: false });
```

---

## 4. Usage Examples

### Example 1: Payments Page with All Features

```typescript
import { useRealtimePayments } from './hooks/useRealtimeData';
import { useAdvancedFilters } from './hooks/useAdvancedFilters';
import { usePagination } from './hooks/usePagination';
import { LiveIndicator } from './components/LiveIndicator';
import { DateRangePicker } from './components/filters/DateRangePicker';
import { MultiSelectFilter } from './components/filters/MultiSelectFilter';

function PaymentsPage() {
  // Real-time data
  const { data, isLive, lastUpdate, refresh } = useRealtimePayments();

  // Advanced filtering
  const {
    filters,
    setSearch,
    setDateRange,
    addMultiSelectFilter,
    removeMultiSelectFilter,
    clearMultiSelectFilter,
    applyFilters,
  } = useAdvancedFilters({ persistKey: 'payments-filters' });

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    paginate,
    totalPages,
  } = usePagination();

  // Apply filters
  const filteredData = applyFilters(data, {
    searchFields: ['investisseur', 'tranche_name'],
    dateField: 'date_paiement',
  });

  // Apply pagination
  const paginatedData = paginate(filteredData);

  return (
    <div>
      {/* Live indicator */}
      <LiveIndicator
        isLive={isLive}
        lastUpdate={lastUpdate}
        onRefresh={refresh}
      />

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
        />

        <DateRangePicker
          startDate={filters.dateRange.startDate}
          endDate={filters.dateRange.endDate}
          onStartDateChange={(date) => setDateRange(date, filters.dateRange.endDate)}
          onEndDateChange={(date) => setDateRange(filters.dateRange.startDate, date)}
        />

        <MultiSelectFilter
          label="Statut"
          options={[
            { value: 'payé', label: 'Payé' },
            { value: 'en_attente', label: 'En attente' },
          ]}
          selectedValues={
            filters.multiSelect.find(f => f.field === 'statut')?.values || []
          }
          onAdd={(value) => addMultiSelectFilter('statut', value)}
          onRemove={(value) => removeMultiSelectFilter('statut', value)}
          onClear={() => clearMultiSelectFilter('statut')}
        />
      </div>

      {/* Data table */}
      <table>
        {paginatedData.map(payment => (
          <tr key={payment.id}>
            <td>{payment.investisseur?.nom_raison_sociale}</td>
            <td>{payment.montant}</td>
            <td>{payment.date_paiement}</td>
          </tr>
        ))}
      </table>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages(filteredData.length)}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

### Example 2: Investors with Filter Presets

```typescript
import { useRealtimeInvestors } from './hooks/useRealtimeData';
import { useAdvancedFilters } from './hooks/useAdvancedFilters';
import { FilterPresets } from './components/filters/FilterPresets';

function InvestorsPage() {
  const { data, isLive } = useRealtimeInvestors();

  const {
    filters,
    applyFilters,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
  } = useAdvancedFilters({ persistKey: 'investors-filters' });

  const filteredData = applyFilters(data, {
    searchFields: ['nom_raison_sociale', 'email'],
  });

  return (
    <div>
      {/* Filter presets */}
      <FilterPresets
        presets={presets}
        onSave={savePreset}
        onLoad={loadPreset}
        onDelete={deletePreset}
      />

      {/* Your table */}
      <table>
        {filteredData.map(investor => (
          <tr key={investor.id}>...</tr>
        ))}
      </table>
    </div>
  );
}
```

---

## Benefits Summary

### Environment Variables
- ✅ Easy configuration management
- ✅ No code changes for settings
- ✅ Environment-specific values
- ✅ Type-safe with fallbacks

### Advanced Filtering
- ✅ Powerful search and filtering
- ✅ Date range selection
- ✅ Multiple filter types
- ✅ Save favorite filters
- ✅ Persistent across sessions

### Real-time Updates
- ✅ Always show latest data
- ✅ No manual refreshing needed
- ✅ Visual connection status
- ✅ Automatic synchronization
- ✅ Minimal code changes required

---

## Next Steps

1. Copy `.env.example` to `.env` and configure your values
2. Replace existing data fetching with realtime hooks
3. Add filters to your table components
4. Test real-time updates by making changes in Supabase
5. Customize filter presets for your users

---

## Support

For questions or issues with these features, check:
- The example code in this document
- Individual component files for detailed JSDoc comments
- Supabase documentation for realtime features
