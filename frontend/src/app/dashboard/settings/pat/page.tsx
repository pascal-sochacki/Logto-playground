"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/app/trpc/rq-client";

const currentDate = new Date(); // Month is 0-indexed (5 = June)
function getFutureTimestamp(days: number) {
  const futureDate = new Date(currentDate.getTime()); // Create a copy
  futureDate.setDate(currentDate.getDate() + days);
  return futureDate.getTime(); // Returns epoch time in milliseconds
}

const EXPIRATION_OPTIONS = [
  { value: getFutureTimestamp(7), label: "7 days" },
  { value: getFutureTimestamp(30), label: "30 days" },
  { value: getFutureTimestamp(180), label: "180 days" },
  { value: getFutureTimestamp(365), label: "365 days" },
  { value: -1, label: "Never" },
];

export default function Component() {
  const tokens = api.pats.list.useQuery();
  const createToken = api.pats.createPat.useMutation();
  const deleteToken = api.pats.delete.useMutation();
  const utils = api.useUtils();

  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpiration, setNewTokenExpiration] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCreateToken = () => {
    if (!newTokenName.trim() || !newTokenExpiration) {
      toast("Error", {
        description: "Please fill in all fields",
      });
      return;
    }

    setIsCreating(true);
    createToken.mutate(
      { name: newTokenName, expiresAt: parseInt(newTokenExpiration) },
      {
        onSuccess: function () {
          utils.invalidate();
          setNewTokenName("");
          setNewTokenExpiration("");
          setIsCreating(false);

          toast("Token created", {
            description:
              "Your new personal access token has been created successfully.",
          });
        },
      },
    );
  };

  const handleDeleteToken = (name: string) => {
    deleteToken.mutate(
      { name: name },
      {
        onSuccess: function () {
          utils.invalidate();
          toast("Token deleted", {
            description: "The personal access token has been deleted.",
          });
        },
      },
    );
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast("Copied", {
        description: "Token copied to clipboard",
      });
    } catch (err) {
      toast("Failed to copy token", {});
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getExpirationStatus = (expiresAt: Date | null) => {
    if (!expiresAt) return { status: "never", variant: "secondary" as const };

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0)
      return { status: "expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 7)
      return {
        status: `${daysUntilExpiry}d left`,
        variant: "destructive" as const,
      };
    if (daysUntilExpiry <= 30)
      return {
        status: `${daysUntilExpiry}d left`,
        variant: "secondary" as const,
      };

    return {
      status: `${daysUntilExpiry}d left`,
      variant: "secondary" as const,
    };
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Personal Access Tokens</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal access tokens to authenticate with the API
          </p>
        </div>

        {/* Create New Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Token
            </CardTitle>
            <CardDescription>
              Generate a new personal access token for API authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Token Name</Label>
                <Input
                  id="token-name"
                  placeholder="e.g., Production API"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration</Label>
                <Select
                  value={newTokenExpiration}
                  onValueChange={setNewTokenExpiration}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleCreateToken}
              disabled={
                isCreating || !newTokenName.trim() || !newTokenExpiration
              }
              className="w-full md:w-auto"
            >
              {isCreating ? "Creating..." : "Create Token"}
            </Button>
          </CardContent>
        </Card>

        {/* Tokens List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Tokens</CardTitle>
            <CardDescription>
              {tokens.data?.length === 0
                ? "No tokens created yet"
                : `You have ${tokens.data?.length} token${tokens.data?.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokens.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No personal access tokens found.</p>
                <p className="text-sm">
                  Create your first token above to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.data?.map((token) => {
                      const expirationStatus = getExpirationStatus(
                        token.expiresAt,
                      );
                      return (
                        <TableRow key={token.name}>
                          <TableCell className="font-medium">
                            {token.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {token.value.substring(0, 12)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyToken(token.value)}
                                className="h-8 w-8 p-0"
                              >
                                {copiedToken === token.value ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(token.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={expirationStatus.variant}>
                              {token.expiresAt
                                ? expirationStatus.status
                                : "Never"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Token
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the token "
                                    {token.name}"? This action cannot be undone
                                    and will immediately revoke access for any
                                    applications using this token.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteToken(token.name)
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Token
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
