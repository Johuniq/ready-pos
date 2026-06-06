import { useCart } from "@/admin/hooks/useCart";
import CustomerFormModal from "@/admin/pages/customers/components/CustomerFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CustomerSelect() {
  const { customer, setCustomer } = useCart();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch customers on search input changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.get("/customers/search", { search });
      setResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (cust) => {
    setCustomer(cust);
    setSearch("");
    setResults([]);
    toast.success(
      `Assigned customer: ${cust.first_name} ${cust.last_name || ""}`,
    );
  };

  const handleClearCustomer = () => {
    setCustomer(null);
    toast.info("Cleared assigned customer");
  };

  // After a successful create from the shared modal, auto-assign the new
  // customer to the current cart so the cashier can keep checking out.
  const handleCustomerCreated = (created) => {
    setCustomer(created);
    toast.success(`Assigned customer: ${created.first_name}`);
  };

  return (
    <div className="p-3 border-b bg-card select-none">
      {/* If customer is selected, show detail card */}
      {customer ? (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2 px-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {customer.first_name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {customer.first_name} {customer.last_name}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {customer.phone || customer.email || "No details"}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearCustomer}
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        /* Customer search field with quick add button */
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              id="customer-search-input"
              placeholder="Add or search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {/* Dropdown list for search results */}
            {search && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-popover text-popover-foreground border rounded-lg mt-1 shadow-lg z-50 max-h-48 overflow-y-auto">
                {results.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className="p-2 py-1.5 hover:bg-muted text-xs cursor-pointer flex justify-between items-center transition-colors">
                    <div>
                      <span className="font-semibold">
                        {cust.first_name} {cust.last_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {cust.phone || cust.email || "No contact info"}
                      </span>
                    </div>
                    <Check className="w-3.5 h-3.5 text-primary opacity-0 hover:opacity-100" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowCreateModal(true)}
            className="h-9 w-9 rounded-lg shrink-0"
            title="Add New Customer">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Shared create modal: same backend wiring as the Customer Management page */}
      <CustomerFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        mode="create"
        onSaved={handleCustomerCreated}
        compact
      />
    </div>
  );
}
