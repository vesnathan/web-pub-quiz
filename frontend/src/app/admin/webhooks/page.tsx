"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
} from "@nextui-org/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RequireAdmin } from "@/components/auth";
import { useWebhookLogs } from "@/hooks/queries";
import type { WebhookLog } from "@quiz/shared";

function WebhookLogsContent() {
  const [provider, setProvider] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Use TanStack Query with infinite scrolling
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: queryError,
  } = useWebhookLogs(provider === "all" ? null : provider);

  // Flatten pages into single array
  const logs = data?.pages.flatMap((page) => page.items) ?? [];
  const loading = isLoading;
  const error = queryError ? "Failed to fetch webhook logs" : null;

  const handleViewPayload = (log: WebhookLog) => {
    setSelectedLog(log);
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processed":
        return "success";
      case "received":
        return "primary";
      case "error":
        return "danger";
      default:
        return "default";
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatPayload = (payload: string) => {
    try {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      return payload;
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-gray-800/70 backdrop-blur">
            <CardHeader className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Webhook Logs</h1>
              <div className="flex gap-4 items-center">
                <Select
                  label="Provider"
                  size="sm"
                  className="w-40"
                  selectedKeys={[provider]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setProvider(selected);
                  }}
                >
                  <SelectItem key="all">All</SelectItem>
                  <SelectItem key="stripe">Stripe</SelectItem>
                  <SelectItem key="paypal">PayPal</SelectItem>
                </Select>
                <Button
                  color="primary"
                  size="sm"
                  onPress={() => refetch()}
                  isLoading={loading}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {loading && logs.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No webhook logs found</p>
                </div>
              ) : (
                <>
                  <Table aria-label="Webhook logs table">
                    <TableHeader>
                      <TableColumn>TIME</TableColumn>
                      <TableColumn>PROVIDER</TableColumn>
                      <TableColumn>EVENT TYPE</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow
                          key={`${log.provider}-${log.createdAt}-${log.eventId}`}
                        >
                          <TableCell>
                            <span className="text-sm text-gray-300">
                              {formatDate(log.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              color={
                                log.provider === "stripe"
                                  ? "secondary"
                                  : "warning"
                              }
                              variant="flat"
                            >
                              {log.provider.toUpperCase()}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {log.eventType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              color={getStatusColor(log.status)}
                              variant="flat"
                            >
                              {log.status}
                            </Chip>
                            {log.errorMessage && (
                              <p className="text-xs text-red-400 mt-1">
                                {log.errorMessage}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => handleViewPayload(log)}
                            >
                              View Payload
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {hasNextPage && (
                    <div className="flex justify-center mt-4">
                      <Button
                        color="primary"
                        variant="flat"
                        onPress={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Payload Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>Webhook Payload</span>
                {selectedLog && (
                  <span className="text-sm font-normal text-gray-400">
                    {selectedLog.eventType} -{" "}
                    {formatDate(selectedLog.createdAt)}
                  </span>
                )}
              </ModalHeader>
              <ModalBody>
                {selectedLog && (
                  <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-xs font-mono text-gray-300 max-h-96">
                    {formatPayload(selectedLog.payload)}
                  </pre>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default function WebhookLogsPage() {
  return (
    <RequireAdmin>
      <WebhookLogsContent />
    </RequireAdmin>
  );
}
