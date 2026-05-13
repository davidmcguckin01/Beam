"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  deriveCompanyUrl,
  fetchFaviconUrlForCustomer,
} from "@/lib/customer-branding";
import { BrandIcon } from "@/components/brand-icon";

export function CustomerModal({
  onClose,
  onCreate,
  initialData,
}: {
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  initialData?: any;
}) {
  const getInitialName = () => {
    if (initialData?.name) return initialData.name;
    if (initialData?.firstName || initialData?.lastName) {
      return [initialData.firstName, initialData.lastName]
        .filter(Boolean)
        .join(" ");
    }
    return "";
  };

  const getInitialContractValue = () => {
    if (initialData?.contractValue) {
      return typeof initialData.contractValue === "number"
        ? initialData.contractValue.toString()
        : initialData.contractValue;
    }
    return "";
  };

  const [formData, setFormData] = useState({
    name: getInitialName(),
    email: initialData?.email || "",
    company: initialData?.company || "",
    companyUrl: initialData?.companyUrl || "",
    contractValue: getInitialContractValue(),
    contractType: (initialData?.contractType || "monthly") as
      | "monthly"
      | "yearly",
    notes: initialData?.notes || "",
    faviconUrl: initialData?.faviconUrl || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fetchingFavicon, setFetchingFavicon] = useState(false);
  const [companyUrlTouched, setCompanyUrlTouched] = useState(
    Boolean(initialData?.companyUrl)
  );

  useEffect(() => {
    if (initialData) {
      const name =
        initialData.name ||
        (initialData.firstName || initialData.lastName
          ? [initialData.firstName, initialData.lastName]
              .filter(Boolean)
              .join(" ")
          : "");
      const contractValue = initialData.contractValue
        ? typeof initialData.contractValue === "number"
          ? initialData.contractValue.toString()
          : initialData.contractValue
        : "";
      setFormData((prev) => ({
        ...prev,
        name: name || prev.name,
        email: initialData.email || prev.email,
        company: initialData.company || prev.company,
        companyUrl: initialData.companyUrl || prev.companyUrl,
        contractValue: contractValue || prev.contractValue,
        contractType: initialData.contractType || prev.contractType,
        notes: initialData.notes || prev.notes,
        faviconUrl: initialData.faviconUrl || prev.faviconUrl,
      }));
    }
  }, [initialData]);

  const handleEmailChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, email: value };
      if (!companyUrlTouched) {
        const derivedUrl = deriveCompanyUrl(next.company, value);
        if (derivedUrl) {
          next.companyUrl = derivedUrl;
        }
      }
      return next;
    });
  };

  const handleCompanyUrlChange = (value: string) => {
    setCompanyUrlTouched(true);
    setFormData((prev) => ({ ...prev, companyUrl: value }));
  };

  const handleFetchFavicon = async () => {
    if (!formData.company && !formData.email && !formData.companyUrl) return;
    setFetchingFavicon(true);
    try {
      const faviconUrl = await fetchFaviconUrlForCustomer(
        formData.company,
        formData.email,
        formData.companyUrl
      );
      if (faviconUrl) {
        setFormData((prev) => ({ ...prev, faviconUrl }));
      }
    } catch (error) {
      console.error("Failed to fetch favicon", error);
    } finally {
      setFetchingFavicon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      await onCreate({
        ...formData,
        companyUrl: formData.companyUrl?.trim() || null,
        contractValue: formData.contractValue
          ? parseFloat(formData.contractValue)
          : null,
        faviconUrl: formData.faviconUrl || null,
      });
    } catch (err) {
      console.error("Error creating customer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New Customer</DialogTitle>
        <DialogDescription>
          Create a new customer profile to associate with feedback.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            type="text"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            placeholder="Acme Inc."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyUrl">Website</Label>
          <Input
            id="companyUrl"
            type="url"
            value={formData.companyUrl}
            onChange={(e) => handleCompanyUrlChange(e.target.value)}
            placeholder="https://example.com"
          />
          <p className="text-xs text-gray-500">
            If blank, we attempt to auto-fill from the email domain.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Brand Icon</Label>
          {formData.faviconUrl ? (
            <div className="flex items-center gap-3">
              <BrandIcon
                src={formData.faviconUrl}
                label={
                  formData.company ||
                  formData.name ||
                  formData.email ||
                  "Brand"
                }
                size={40}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, faviconUrl: "" }))
                }
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFetchFavicon}
              disabled={fetchingFavicon || (!formData.company && !formData.email)}
            >
              {fetchingFavicon ? "Fetching favicon..." : "Auto-fetch favicon"}
            </Button>
          )}
          <p className="text-xs text-gray-500">
            {formData.company || formData.email
              ? "We'll try to look up the company's favicon using the email or company name."
              : "Enter a company or email to auto-detect the favicon."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractValue">Contract Value</Label>
            <Input
              id="contractValue"
              type="number"
              step="0.01"
              value={formData.contractValue}
              onChange={(e) =>
                setFormData({ ...formData, contractValue: e.target.value })
              }
              placeholder="5000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractType">Type</Label>
            <Select
              value={formData.contractType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  contractType: value as "monthly" | "yearly",
                })
              }
            >
              <SelectTrigger id="contractType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
            placeholder="Additional notes..."
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
            {submitting ? "Creating..." : "Create Customer"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
