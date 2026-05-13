"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Download,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Copy,
  UserRound,
  Building2,
  Globe,
  Mail,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  deriveCompanyUrl,
  getFallbackFaviconUrl,
} from "@/lib/customer-branding";
import { BrandIcon } from "@/components/brand-icon";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  companyUrl: string | null;
  faviconUrl: string | null;
  contractValue: string | null;
  contractType: "monthly" | "yearly";
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerProfile {
  customer: Customer;
  person: {
    name: string | null;
    email: string | null;
    role: string | null;
    seniority: string | null;
    linkedinUrl: string | null;
    lastUpdated: string | null;
  } | null;
  company: {
    name: string | null;
    domain: string | null;
    industry: string | null;
    employeeCount: number | null;
    revenue: string | null;
    website: string | null;
    linkedinUrl: string | null;
    lastUpdated: string | null;
  } | null;
  activity: {
    lastSubmittedAt: string | null;
    source: string | null;
    ipAddress: string | null;
    planTier: string | null;
  } | null;
}

export default function CustomersPage() {
  const { isSignedIn, user } = useUser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerFeedback, setCustomerFeedback] = useState<any[]>([]);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [exportingCustomers, setExportingCustomers] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(
    new Set()
  );
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const shiftKeyRef = useRef<boolean>(false);
  const [sortField, setSortField] = useState<
    "name" | "contract" | "annualValue" | "status" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const CUSTOMERS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isSignedIn) {
      loadCustomers();
    }
  }, [isSignedIn]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCompany,
    sortField,
    sortDirection,
    customers.length,
  ]);

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        // Clear selection when customers are reloaded
        setSelectedCustomers(new Set());
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    const id = pendingDeleteId;
    setShowDeleteConfirm(false);
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await loadCustomers();
        toast.success("Customer deleted successfully");
      } else {
        toast.error("Failed to delete customer");
      }
    } catch (err) {
      console.error("Failed to delete customer:", err);
      toast.error("An error occurred while deleting the customer");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleRowClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowFeedbackModal(true);
    setLoadingFeedback(true);
    setCustomerProfile(null);

    try {
      const response = await fetch(`/api/customers/${customer.id}/feedback`);
      if (response.ok) {
        const data = await response.json();
        setCustomerFeedback(data.feedback || []);
        setCustomerProfile(data.profile || null);
      } else {
        console.error("Failed to load feedback");
        setCustomerFeedback([]);
        setCustomerProfile(null);
      }
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setCustomerFeedback([]);
      setCustomerProfile(null);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleCopyToClipboard = async (value: string | null, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error("Failed to copy", error);
      toast.error("Unable to copy to clipboard");
    }
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (date: string | null | undefined) => {
    if (!date) return null;
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  const formatSourceLabel = (source: string | null | undefined) => {
    if (!source) return "feedback";
    return source.split("_").filter(Boolean).join(" ");
  };

  const fetchCustomerProfileSummary = async (
    customerId: string
  ): Promise<CustomerProfile | null> => {
    try {
      const response = await fetch(`/api/customers/${customerId}/feedback`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.profile ?? null;
    } catch (error) {
      console.error("Failed to fetch customer profile for export:", error);
      return null;
    }
  };

  const handleSave = async (customerData: any) => {
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        await loadCustomers();
        setShowModal(false);
        setEditingCustomer(null);
      }
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
  };

  const totalAnnualValue = customers
    .filter((c) => c.isActive && c.contractValue)
    .reduce((sum, c) => {
      const value = parseFloat(c.contractValue || "0");
      const annual = c.contractType === "yearly" ? value : value * 12;
      return sum + annual;
    }, 0);

  const highValueCustomers = customers.filter((c) => {
    if (!c.isActive || !c.contractValue) return false;
    const value = parseFloat(c.contractValue);
    const annual = c.contractType === "yearly" ? value : value * 12;
    return annual > 50000;
  }).length;

  // Get unique companies
  const uniqueCompanies = Array.from(
    new Set(
      customers
        .filter((c) => c.company && c.company.trim())
        .map((c) => c.company!.trim())
    )
  ).sort();

  const totalCompanies = uniqueCompanies.length;

  // Filter customers by selected company and search query
  const filteredCustomers = customers.filter((customer) => {
    // Filter by company
    const matchesCompany =
      selectedCompany === "all" ||
      (customer.company && customer.company.trim() === selectedCompany);

    // Filter by search query (name, email, or company)
    const matchesSearch =
      !searchQuery.trim() ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (customer.company &&
        customer.company.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCompany && matchesSearch;
  });

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "contract":
        aValue = a.contractValue ? parseFloat(a.contractValue) : 0;
        bValue = b.contractValue ? parseFloat(b.contractValue) : 0;
        break;
      case "annualValue":
        const aContract = a.contractValue ? parseFloat(a.contractValue) : 0;
        const bContract = b.contractValue ? parseFloat(b.contractValue) : 0;
        aValue = a.contractType === "yearly" ? aContract : aContract * 12;
        bValue = b.contractType === "yearly" ? bContract : bContract * 12;
        break;
      case "status":
        aValue = a.isActive ? 1 : 0;
        bValue = b.isActive ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    const maxPages = Math.max(
      1,
      Math.ceil(sortedCustomers.length / CUSTOMERS_PER_PAGE)
    );
    if (currentPage > maxPages) {
      setCurrentPage(maxPages);
    }
  }, [sortedCustomers.length, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedCustomers.length / CUSTOMERS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
  const paginatedCustomers = sortedCustomers.slice(
    startIndex,
    startIndex + CUSTOMERS_PER_PAGE
  );
  const showingStart = sortedCustomers.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(
    sortedCustomers.length,
    startIndex + CUSTOMERS_PER_PAGE
  );

  const handleSort = (
    field: "name" | "contract" | "annualValue" | "status"
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({
    field,
  }: {
    field: "name" | "contract" | "annualValue" | "status";
  }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-gray-500" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 text-gray-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 text-gray-600" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Customers</h1>
            <p className="text-sm text-gray-500">Manage your customer database and contracts</p>
          </div>
          {!loading && customers.length > 0 && (
            <div className="shrink-0">
              <Button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowModal(true);
                }}
                size="sm"
                className="gap-2 bg-black hover:bg-gray-900 text-white cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Customer
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Stats */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Total Customers
              </p>
              <p className="text-2xl font-bold">
                {customers.filter((c) => c.isActive).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Total Companies
              </p>
              <p className="text-2xl font-bold">{totalCompanies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                High-Value
              </p>
              <p className="text-2xl font-bold text-destructive">
                {highValueCustomers}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Total ARR
              </p>
              <p className="text-2xl font-bold">
                ${totalAnnualValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      {!loading && customers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between mb-4">
          {/* Company Filter */}
          {uniqueCompanies.length > 0 && (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger
                id="company-filter"
                className="w-full sm:w-[200px]"
              >
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {uniqueCompanies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search Input */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search customers by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {sortedCustomers.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (selectedCustomers.size === sortedCustomers.length) {
                setSelectedCustomers(new Set());
                setLastSelectedIndex(null);
              } else {
                setSelectedCustomers(new Set(sortedCustomers.map((c) => c.id)));
                // Set last selected to the last item when selecting all
                setLastSelectedIndex(sortedCustomers.length - 1);
              }
            }}
            className="h-8 px-3 text-xs"
          >
            {selectedCustomers.size === sortedCustomers.length
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (exportingCustomers || sortedCustomers.length === 0) return;

              const customersToExport =
                selectedCustomers.size > 0
                  ? sortedCustomers.filter((c) => selectedCustomers.has(c.id))
                  : sortedCustomers;

              setExportingCustomers(true);
              try {
                const profileSummaries = await Promise.all(
                  customersToExport.map(async (customer) => {
                    const profile = await fetchCustomerProfileSummary(
                      customer.id
                    );
                    return { id: customer.id, profile };
                  })
                );
                const profileMap = new Map<string, CustomerProfile | null>();
                profileSummaries.forEach(({ id, profile }) => {
                  profileMap.set(id, profile);
                });

                const headers = [
                  "Customer Name",
                  "Customer Email",
                  "Contact Role",
                  "Contact Seniority",
                  "Contact LinkedIn",
                  "Company",
                  "Industry",
                  "Company Domain",
                  "Company Website",
                  "Company Employees",
                  "Company Revenue",
                  "Contract Value",
                  "Contract Type",
                  "Annualized Value",
                  "Status",
                  "Notes",
                  "Plan Tier",
                  "Last Feedback",
                  "Feedback Source",
                  "IP Address",
                ];

                const rows = customersToExport.map((customer) => {
                  const contractValue = customer.contractValue
                    ? parseFloat(customer.contractValue)
                    : 0;
                  const annualValue =
                    customer.contractType === "yearly"
                      ? contractValue
                      : contractValue * 12;
                  const profile = profileMap.get(customer.id) || null;
                  const person = profile?.person;
                  const company = profile?.company;
                  const activity = profile?.activity;

                  const formatExportDate = (date?: string | null) =>
                    date ? new Date(date).toLocaleString() : "";

                  return [
                    customer.name || "",
                    customer.email || person?.email || "",
                    person?.role || "",
                    person?.seniority || "",
                    person?.linkedinUrl || "",
                    company?.name || customer.company || "",
                    company?.industry || "",
                    company?.domain || "",
                    company?.website || customer.companyUrl || "",
                    company?.employeeCount
                      ? company.employeeCount.toLocaleString()
                      : "",
                    company?.revenue || "",
                    customer.contractValue || "",
                    customer.contractType || "",
                    annualValue > 0 ? `$${annualValue.toLocaleString()}` : "",
                    customer.isActive ? "Active" : "Inactive",
                    customer.notes || "",
                    activity?.planTier || "",
                    formatExportDate(activity?.lastSubmittedAt),
                    activity?.source || "",
                    activity?.ipAddress || "",
                  ];
                });

                const csvContent = [
                  headers.join(","),
                  ...rows.map((row) =>
                    row
                      .map((cell) => {
                        const cellStr = String(cell ?? "");
                        if (
                          cellStr.includes(",") ||
                          cellStr.includes('"') ||
                          cellStr.includes("\n")
                        ) {
                          return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                      })
                      .join(",")
                  ),
                ].join("\n");

                const blob = new Blob([csvContent], {
                  type: "text/csv;charset=utf-8;",
                });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute(
                  "download",
                  `customers-export-${
                    new Date().toISOString().split("T")[0]
                  }.csv`
                );
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast.success(
                  `Exported ${customersToExport.length} customer${
                    customersToExport.length !== 1 ? "s" : ""
                  } to CSV`
                );
              } catch (error) {
                console.error("Failed to export customers", error);
                toast.error("Something went wrong while exporting customers");
              } finally {
                setExportingCustomers(false);
              }
            }}
            disabled={sortedCustomers.length === 0 || exportingCustomers}
            className="h-8 px-3 text-xs"
          >
            {exportingCustomers ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            {exportingCustomers ? "Exporting..." : "Export to CSV"}
            {!exportingCustomers &&
              selectedCustomers.size > 0 &&
              ` (${selectedCustomers.size} selected)`}
          </Button>
          {selectedCustomers.size > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowBulkDeleteConfirm(true);
              }}
              className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Selected ({selectedCustomers.size})
            </Button>
          )}
        </div>
      )}

      {/* Customers Table */}
      {loading ? (
        <Card className="overflow-hidden">
          <div className="p-6">
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-6 gap-4 mb-4 pb-3 border-b border-gray-200">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            {/* Table Rows Skeleton */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-4 py-4 border-b border-gray-100"
              >
                <Skeleton className="h-4 w-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : customers.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <Image
              src="/images/empty-state.webp"
              alt="No customers yet"
              width={500}
              height={500}
              className="rounded-xl  mb-6 mx-auto"
            />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No customers yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Stop the chaos your customer database by adding your first
              customer.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              size="sm"
              className="bg-black hover:bg-gray-900 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Customer
            </Button>
          </div>
        </div>
      ) : sortedCustomers.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedCompany !== "all"
                ? "No customers found matching your search or filter"
                : "No customers found"}
            </p>
            {(searchQuery || selectedCompany !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCompany("all");
                }}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 -colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <Checkbox
                      checked={
                        sortedCustomers.length > 0 &&
                        selectedCustomers.size === sortedCustomers.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCustomers(
                            new Set(sortedCustomers.map((c) => c.id))
                          );
                        } else {
                          setSelectedCustomers(new Set());
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSort("name");
                      }}
                      className="flex items-center hover:text-gray-700 -colors"
                    >
                      Customer
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSort("contract");
                      }}
                      className="flex items-center hover:text-gray-700 -colors"
                    >
                      Contract
                      <SortIcon field="contract" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSort("annualValue");
                      }}
                      className="flex items-center hover:text-gray-700 -colors"
                    >
                      Annual Value
                      <SortIcon field="annualValue" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSort("status");
                      }}
                      className="flex items-center hover:text-gray-700 -colors"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCustomers.map((customer, index) => {
                  const contractValue = customer.contractValue
                    ? parseFloat(customer.contractValue)
                    : 0;
                  const annualValue =
                    customer.contractType === "yearly"
                      ? contractValue
                      : contractValue * 12;
                  const isHighValue = annualValue > 50000;
                  const isMediumValue = annualValue > 10000;

                  // Get the actual index in sortedCustomers
                  const actualIndex = sortedCustomers.findIndex(
                    (c) => c.id === customer.id
                  );

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50/50 -colors cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("[role='checkbox']") ||
                          target.getAttribute("role") === "checkbox"
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        handleRowClick(customer);
                      }}
                    >
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={(checked) => {
                            // Only handle if it wasn't a shift-click (handled in onMouseDown)
                            if (!shiftKeyRef.current) {
                              setSelectedCustomers((prev) => {
                                const next = new Set(prev);
                                if (checked) {
                                  next.add(customer.id);
                                } else {
                                  next.delete(customer.id);
                                }
                                return next;
                              });
                              setLastSelectedIndex(actualIndex);
                            }
                            shiftKeyRef.current = false; // Reset
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Prevent default for shift-clicks to handle range selection
                            if (e.shiftKey) {
                              e.preventDefault();
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            // Handle shift-click for range selection
                            if (e.shiftKey) {
                              e.preventDefault();
                              shiftKeyRef.current = true;
                              const checked = !selectedCustomers.has(
                                customer.id
                              );

                              if (
                                lastSelectedIndex !== null &&
                                lastSelectedIndex >= 0
                              ) {
                                // Shift-click: select range between last selected and current
                                const startIndex = Math.min(
                                  lastSelectedIndex,
                                  actualIndex
                                );
                                const endIndex = Math.max(
                                  lastSelectedIndex,
                                  actualIndex
                                );

                                setSelectedCustomers((prev) => {
                                  const next = new Set(prev);
                                  // Select all items in the range
                                  for (let i = startIndex; i <= endIndex; i++) {
                                    const rangeCustomer = sortedCustomers[i];
                                    if (rangeCustomer) {
                                      if (checked) {
                                        next.add(rangeCustomer.id);
                                      } else {
                                        next.delete(rangeCustomer.id);
                                      }
                                    }
                                  }
                                  return next;
                                });
                              } else {
                                // No last selected, just toggle this one
                                setSelectedCustomers((prev) => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(customer.id);
                                  } else {
                                    next.delete(customer.id);
                                  }
                                  return next;
                                });
                              }

                              // Update last selected index
                              setLastSelectedIndex(actualIndex);
                            } else {
                              shiftKeyRef.current = false;
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="text-sm font-semibold text-gray-900">
                            {customer.name}
                          </div>
                          {customer.company && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <BrandIcon
                                src={
                                  customer.faviconUrl ||
                                  getFallbackFaviconUrl(
                                    customer.company,
                                    customer.email
                                  )
                                }
                                label={
                                  customer.company ||
                                  customer.name ||
                                  customer.email ||
                                  "Customer"
                                }
                                size={18}
                                roundedClassName="rounded-md"
                                className="shrink-0"
                              />
                              <span>{customer.company}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-xs text-gray-500">
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.contractValue ? (
                          <div className="text-sm text-gray-900">
                            ${contractValue.toLocaleString()}/
                            {customer.contractType === "yearly" ? "yr" : "mo"}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No contract
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {customer.contractValue ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-semibold ${
                                isHighValue
                                  ? "text-red-600"
                                  : isMediumValue
                                  ? "text-yellow-600"
                                  : "text-gray-900"
                              }`}
                            >
                              ${annualValue.toLocaleString()}
                            </span>
                            {isHighValue && <span className="text-xs">⭐</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No contract
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            customer.isActive
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditingCustomer(customer);
                              setShowModal(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 -colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 -colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-4 px-6 py-4 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {sortedCustomers.length === 0
                ? "No customers to display"
                : `Showing ${showingStart}-${showingEnd} of ${sortedCustomers.length}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || sortedCustomers.length === 0}
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-gray-700">
                Page {Math.min(currentPage, totalPages)} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={
                  currentPage === totalPages || sortedCustomers.length === 0
                }
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Customer Modal */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingCustomer(null);
        }}
      >
        <DialogContent>
          <CustomerModal
            customer={editingCustomer}
            onClose={() => {
              setShowModal(false);
              setEditingCustomer(null);
            }}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>

      {/* Customer Feedback Modal */}
      <Dialog
        open={showFeedbackModal}
        onOpenChange={(open) => {
          setShowFeedbackModal(open);
          if (!open) {
            setSelectedCustomer(null);
            setCustomerFeedback([]);
            setCustomerProfile(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Feedback from {selectedCustomer?.name || "Customer"}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer?.email && `Email: ${selectedCustomer.email}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-6">
            {customerProfile && (
              <section className="space-y-6 -100 bg-white/80 ">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5   ">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900/5 text-gray-900">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-base font-semibold text-gray-900">
                            Contact
                          </h4>
                          {(customerProfile.person?.email ||
                            selectedCustomer?.email) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs hover:bg-gray-50/50 forced-colors"
                              onClick={() =>
                                handleCopyToClipboard(
                                  customerProfile.person?.email ||
                                    selectedCustomer?.email ||
                                    null,
                                  "Email"
                                )
                              }
                            >
                              <Copy className="mr-1 h-3.5 w-3.5" />
                              Copy
                            </Button>
                          )}
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                          <div>
                            <span className="text-xs text-gray-500">Name</span>
                            <p className="font-semibold">
                              {customerProfile.person?.name ||
                                selectedCustomer?.name ||
                                "—"}
                            </p>
                          </div>
                          {customerProfile.person?.email ||
                          selectedCustomer?.email ? (
                            <div>
                              <span className="text-xs text-gray-500">
                                Email
                              </span>
                              <p className="font-medium break-all text-gray-900">
                                {customerProfile.person?.email ||
                                  selectedCustomer?.email}
                              </p>
                            </div>
                          ) : null}
                          {customerProfile.person?.role ||
                          customerProfile.person?.seniority ? (
                            <div>
                              <span className="text-xs text-gray-500">
                                Role & Seniority
                              </span>
                              <p className="font-medium text-gray-900">
                                {customerProfile.person?.role}
                                {customerProfile.person?.seniority
                                  ? ` • ${customerProfile.person.seniority}`
                                  : ""}
                              </p>
                            </div>
                          ) : null}
                          {customerProfile.person?.linkedinUrl && (
                            <>
                              <div className="h-px bg-gray-100" />
                              <a
                                href={customerProfile.person.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                View LinkedIn
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-5   ">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900/5 text-gray-900">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-base font-semibold text-gray-900">
                            Company
                          </h4>
                          {(customerProfile.company?.domain ||
                            customerProfile.company?.website ||
                            selectedCustomer?.companyUrl) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs hover:bg-gray-50/50 -colors"
                              onClick={() =>
                                handleCopyToClipboard(
                                  customerProfile.company?.domain ||
                                    customerProfile.company?.website ||
                                    selectedCustomer?.companyUrl ||
                                    null,
                                  "Company URL"
                                )
                              }
                            >
                              <Copy className="mr-1 h-3.5 w-3.5" />
                              Copy
                            </Button>
                          )}
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                          <div>
                            <span className="text-xs text-gray-500">Name</span>
                            <p className="font-semibold">
                              {customerProfile.company?.name ||
                                selectedCustomer?.company ||
                                "—"}
                            </p>
                          </div>
                          {customerProfile.company?.domain ||
                          customerProfile.company?.website ||
                          selectedCustomer?.companyUrl ? (
                            <div>
                              <span className="text-xs text-gray-500">
                                Domain
                              </span>
                              <p className="font-medium break-all text-gray-900">
                                {customerProfile.company?.domain ||
                                  customerProfile.company?.website ||
                                  selectedCustomer?.companyUrl}
                              </p>
                            </div>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2">
                            {customerProfile.company?.industry && (
                              <div>
                                <span className="text-xs text-gray-500">
                                  Industry
                                </span>
                                <p className="font-medium text-gray-900">
                                  {customerProfile.company.industry}
                                </p>
                              </div>
                            )}
                            {customerProfile.company?.employeeCount && (
                              <div>
                                <span className="text-xs text-gray-500">
                                  Employees
                                </span>
                                <p className="font-medium text-gray-900">
                                  {customerProfile.company.employeeCount.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {customerProfile.activity && (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-4">
                    <div className="grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
                      <div>
                        <span className="text-xs text-gray-500 block">
                          Last Seen
                        </span>
                        <p className="font-semibold">
                          {formatDateTime(
                            customerProfile.activity.lastSubmittedAt
                          )}
                          {formatRelativeTime(
                            customerProfile.activity.lastSubmittedAt
                          )
                            ? ` • ${formatRelativeTime(
                                customerProfile.activity.lastSubmittedAt
                              )}`
                            : ""}
                        </p>
                      </div>
                      {customerProfile.activity.source && (
                        <div>
                          <span className="text-xs text-gray-500 block">
                            Source
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs capitalize border border-zinc-200 bg-zinc-100 text-zinc-700"
                          >
                            {formatSourceLabel(customerProfile.activity.source)}
                          </Badge>
                        </div>
                      )}
                      {customerProfile.activity.ipAddress && (
                        <div>
                          <span className="text-xs text-gray-500 block">
                            IP Address
                          </span>
                          <p className="font-medium text-gray-900">
                            {customerProfile.activity.ipAddress}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
            <section className="rounded-3xl border border-gray-100 bg-white/90 p-6">
              <div className="flex flex-col gap-2 border-b border-dashed border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Feedback timeline
                  </h4>
                  <p className="text-sm text-gray-500">
                    Latest qualitative signals from this customer
                  </p>
                </div>
                {customerFeedback.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="w-fit bg-indigo-50 text-indigo-700"
                  >
                    {customerFeedback.length} entr
                    {customerFeedback.length === 1 ? "y" : "ies"}
                  </Badge>
                )}
              </div>
              {loadingFeedback ? (
                <div className="mt-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="border border-gray-100 shadow-none"
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : customerFeedback.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-gray-500">
                  <span className="rounded-full border border-dashed border-gray-200 px-3 py-1 text-xs uppercase tracking-wide">
                    No feedback yet
                  </span>
                  <p className="text-sm">
                    This customer hasn’t submitted any qualitative feedback.
                  </p>
                </div>
              ) : (
                <ol className="mt-6 space-y-6">
                  {customerFeedback.map((feedback, index) => (
                    <li key={feedback.id} className="relative pl-6">
                      {index !== customerFeedback.length - 1 && (
                        <span className="absolute left-2 top-6 bottom-[-1.5rem] w-px bg-gradient-to-b from-indigo-200 to-transparent" />
                      )}
                      <span className="absolute left-0 top-5 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-indigo-500 " />
                      <Card className="border border-gray-100   ">
                        <CardContent className="space-y-3 pt-4">
                          <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <div className="font-medium">
                              {formatDateTime(feedback.createdAt)}
                              {formatRelativeTime(feedback.createdAt)
                                ? ` • ${formatRelativeTime(feedback.createdAt)}`
                                : ""}
                            </div>
                            <Badge
                              variant="secondary"
                              className="w-fit text-xs capitalize border border-zinc-200 bg-zinc-100 text-zinc-700"
                            >
                              {formatSourceLabel(feedback.source)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                            {feedback.rawFeedback}
                          </p>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button
              type="button"
              onClick={() => setShowFeedbackModal(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 !text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Customers</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCustomers.size} selected
              customer{selectedCustomers.size !== 1 ? "s" : ""}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDeleteConfirm(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setShowBulkDeleteConfirm(false);

                const deletedCount = selectedCustomers.size;
                const customerIds = Array.from(selectedCustomers);

                // Delete all selected customers
                try {
                  const deletePromises = customerIds.map((id) =>
                    fetch(`/api/customers/${id}`, {
                      method: "DELETE",
                    })
                  );

                  const results = await Promise.all(deletePromises);
                  const successCount = results.filter((r) => r.ok).length;

                  if (successCount > 0) {
                    await loadCustomers();
                    setSelectedCustomers(new Set());
                    toast.success(
                      `Deleted ${successCount} customer${
                        successCount !== 1 ? "s" : ""
                      } successfully`
                    );
                  } else {
                    toast.error("Failed to delete customers");
                  }
                } catch (err) {
                  console.error("Error deleting customers:", err);
                  toast.error("An error occurred while deleting the customers");
                }
              }}
              className="bg-red-600 hover:bg-red-700 !text-white"
            >
              Delete {selectedCustomers.size} Customer
              {selectedCustomers.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    company: customer?.company || "",
    companyUrl: customer?.companyUrl || "",
    contractValue: customer?.contractValue || "",
    contractType: customer?.contractType || ("monthly" as "monthly" | "yearly"),
    isActive: customer?.isActive ?? true,
    notes: customer?.notes || "",
    faviconUrl: customer?.faviconUrl || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fetchingWebsiteInfo, setFetchingWebsiteInfo] = useState(false);
  const [companyUrlTouched, setCompanyUrlTouched] = useState(
    Boolean(customer?.companyUrl)
  );
  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (urlTimeoutRef.current) {
        clearTimeout(urlTimeoutRef.current);
      }
    };
  }, []);

  const fetchWebsiteInfo = async (url: string) => {
    if (!url.trim()) {
      return null;
    }
    setFetchingWebsiteInfo(true);
    try {
      const response = await fetch("/api/fetch-website-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch website info", error);
      return null;
    } finally {
      setFetchingWebsiteInfo(false);
    }
  };

  const scheduleWebsiteLookup = (value: string, delay = 800) => {
    if (urlTimeoutRef.current) {
      clearTimeout(urlTimeoutRef.current);
    }

    if (!value.trim()) {
      setFormData((prev) => ({ ...prev, faviconUrl: "" }));
      return;
    }

    urlTimeoutRef.current = setTimeout(async () => {
      const info = await fetchWebsiteInfo(value.trim());
      if (info?.faviconUrl) {
        setFormData((prev) => ({ ...prev, faviconUrl: info.faviconUrl }));
      }
      if (info?.title) {
        setFormData((prev) => {
          if (prev.company?.trim()) {
            return prev;
          }
          return { ...prev, company: info.title };
        });
      }
    }, delay);
  };

  const handleCompanyUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanyUrlTouched(true);
    setFormData((prev) => ({ ...prev, companyUrl: value }));
    scheduleWebsiteLookup(value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let derivedUrl: string | null = null;
    setFormData((prev) => {
      const next = { ...prev, email: value };
      if (!companyUrlTouched) {
        const potentialUrl = deriveCompanyUrl(next.company, value);
        if (potentialUrl && potentialUrl !== prev.companyUrl) {
          next.companyUrl = potentialUrl;
          derivedUrl = potentialUrl;
        }
      }
      return next;
    });
    if (derivedUrl) {
      scheduleWebsiteLookup(derivedUrl, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        contractValue: formData.contractValue
          ? parseFloat(formData.contractValue)
          : null,
        faviconUrl: formData.faviconUrl?.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{customer ? "Edit Customer" : "New Customer"}</DialogTitle>
        <DialogDescription>
          {customer
            ? "Update customer information"
            : "Create a new customer profile"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
            />
          </div>
        </div>
        <div>
          <Label>Company</Label>
          <Input
            type="text"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="companyUrl">Website</Label>
          <div className="relative">
            {formData.faviconUrl && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.faviconUrl}
                  alt="Favicon"
                  className="w-4 h-4 rounded"
                  onError={() =>
                    setFormData((prev) => ({ ...prev, faviconUrl: "" }))
                  }
                />
              </div>
            )}
            {fetchingWebsiteInfo && !formData.faviconUrl && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            )}
            <Input
              id="companyUrl"
              type="url"
              placeholder="https://example.com"
              value={formData.companyUrl}
              onChange={handleCompanyUrlChange}
              className={
                formData.faviconUrl || fetchingWebsiteInfo ? "pl-10" : ""
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Paste the company website to auto-detect their favicon.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Contract Value</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.contractValue}
              onChange={(e) =>
                setFormData({ ...formData, contractValue: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={formData.contractType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  contractType: value as "monthly" | "yearly",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onValueChange={(value) =>
                setFormData({ ...formData, isActive: value === "active" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !formData.name.trim()}
            variant="default"
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            {submitting
              ? "Saving..."
              : customer
              ? "Update Customer"
              : "Create Customer"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
