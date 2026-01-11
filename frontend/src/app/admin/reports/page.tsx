"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Divider,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Input,
} from "@nextui-org/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingScreen, LoadingDots } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReports,
  updateReportStatus,
  sendAdminMessage,
  addStrike,
  banUser,
  type Report,
  type ReportStatus,
} from "@/lib/api/admin-reports";

const ADMIN_EMAIL = "vesnathan+qnl-admin@gmail.com";

const STATUS_COLORS: Record<
  ReportStatus,
  "warning" | "primary" | "success" | "default"
> = {
  PENDING: "warning",
  REVIEWED: "primary",
  ACTIONED: "success",
  DISMISSED: "default",
};

const REASON_LABELS: Record<string, string> = {
  INAPPROPRIATE_AVATAR: "Inappropriate Avatar",
  OFFENSIVE_MESSAGE: "Offensive Message",
  HARASSMENT: "Harassment",
  SPAM: "Spam",
};

const CONTEXT_LABELS: Record<string, string> = {
  CHAT_MESSAGE: "Chat Message",
  AVATAR: "Avatar",
  PROFILE: "Profile",
};

export default function AdminReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">(
    "PENDING",
  );
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [strikeReason, setStrikeReason] = useState("");
  const [banReason, setBanReason] = useState("");

  // Fetch reports
  const {
    data: reportsData,
    isLoading: reportsLoading,
    refetch,
  } = useQuery({
    queryKey: ["reports", statusFilter],
    queryFn: () =>
      getReports(statusFilter === "ALL" ? undefined : statusFilter),
    enabled: !!user && user.email === ADMIN_EMAIL,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      reportId,
      status,
      adminNotes,
    }: {
      reportId: string;
      status: ReportStatus;
      adminNotes?: string;
    }) => updateReportStatus(reportId, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setSelectedReport(null);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({
      toUserId,
      subject,
      content,
      relatedReportId,
    }: {
      toUserId: string;
      subject: string;
      content: string;
      relatedReportId?: string;
    }) => sendAdminMessage(toUserId, subject, content, relatedReportId),
    onSuccess: () => {
      setShowMessageModal(false);
      setMessageSubject("");
      setMessageContent("");
    },
  });

  // Add strike mutation
  const addStrikeMutation = useMutation({
    mutationFn: ({
      userId,
      reason,
      relatedReportId,
    }: {
      userId: string;
      reason: string;
      relatedReportId?: string;
    }) => addStrike(userId, reason, relatedReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setShowStrikeModal(false);
      setStrikeReason("");
      setSelectedReport(null);
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: ({
      userId,
      reason,
      relatedReportId,
    }: {
      userId: string;
      reason: string;
      relatedReportId?: string;
    }) => banUser(userId, reason, relatedReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setShowBanModal(false);
      setBanReason("");
      setSelectedReport(null);
    },
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleStatusChange = useCallback(
    (report: Report, newStatus: ReportStatus) => {
      updateStatusMutation.mutate({
        reportId: report.id,
        status: newStatus,
      });
    },
    [updateStatusMutation],
  );

  const handleSendMessage = useCallback((report: Report) => {
    setSelectedReport(report);
    setMessageSubject(
      `Regarding your report of ${report.reportedUserDisplayName}`,
    );
    setMessageContent("");
    setShowMessageModal(true);
  }, []);

  const handleSubmitMessage = useCallback(() => {
    if (!selectedReport || !messageSubject.trim() || !messageContent.trim())
      return;

    sendMessageMutation.mutate({
      toUserId: selectedReport.reporterId,
      subject: messageSubject,
      content: messageContent,
      relatedReportId: selectedReport.id,
    });
  }, [selectedReport, messageSubject, messageContent, sendMessageMutation]);

  const handleAddStrike = useCallback((report: Report) => {
    setSelectedReport(report);
    setStrikeReason(
      `Strike issued for: ${REASON_LABELS[report.reason] || report.reason}`,
    );
    setShowStrikeModal(true);
  }, []);

  const handleSubmitStrike = useCallback(() => {
    if (!selectedReport || !strikeReason.trim()) return;

    addStrikeMutation.mutate({
      userId: selectedReport.reportedUserId,
      reason: strikeReason,
      relatedReportId: selectedReport.id,
    });
  }, [selectedReport, strikeReason, addStrikeMutation]);

  const handleBanUser = useCallback((report: Report) => {
    setSelectedReport(report);
    setBanReason(
      `Banned for: ${REASON_LABELS[report.reason] || report.reason}`,
    );
    setShowBanModal(true);
  }, []);

  const handleSubmitBan = useCallback(() => {
    if (!selectedReport || !banReason.trim()) return;

    banUserMutation.mutate({
      userId: selectedReport.reportedUserId,
      reason: banReason,
      relatedReportId: selectedReport.id,
    });
  }, [selectedReport, banReason, banUserMutation]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  const reports = reportsData?.items || [];

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            User Reports
          </h1>
          <Button
            variant="light"
            onPress={() => router.push("/admin")}
            className="text-gray-400"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Filter */}
        <Card className="bg-gray-800/50">
          <CardBody className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Filter by status:</span>
              <Select
                size="sm"
                className="max-w-xs"
                selectedKeys={[statusFilter]}
                onSelectionChange={(keys) => {
                  const status = Array.from(keys)[0] as ReportStatus | "ALL";
                  if (status) setStatusFilter(status);
                }}
              >
                <SelectItem key="ALL">All Reports</SelectItem>
                <SelectItem key="PENDING">Pending</SelectItem>
                <SelectItem key="REVIEWED">Reviewed</SelectItem>
                <SelectItem key="ACTIONED">Actioned</SelectItem>
                <SelectItem key="DISMISSED">Dismissed</SelectItem>
              </Select>
              <Button
                size="sm"
                variant="flat"
                onPress={() => refetch()}
                isLoading={reportsLoading}
              >
                Refresh
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Reports List */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Reports ({reports.length})
            </h2>
          </CardHeader>
          <Divider />
          <CardBody>
            {reportsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingDots />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No reports found.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onStatusChange={handleStatusChange}
                    onSendMessage={handleSendMessage}
                    onAddStrike={handleAddStrike}
                    onBanUser={handleBanUser}
                    isUpdating={updateStatusMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Send Message Modal */}
      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        size="lg"
        classNames={{
          base: "bg-gray-800 text-white",
          header: "border-b border-gray-700",
          body: "py-6",
          footer: "border-t border-gray-700",
        }}
      >
        <ModalContent>
          <ModalHeader>
            Send Message to Reporter
            {selectedReport && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({selectedReport.reporterDisplayName})
              </span>
            )}
          </ModalHeader>
          <ModalBody>
            <Input
              label="Subject"
              value={messageSubject}
              onValueChange={setMessageSubject}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-gray-700/50",
              }}
            />
            <Textarea
              label="Message"
              value={messageContent}
              onValueChange={setMessageContent}
              minRows={4}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-gray-700/50",
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowMessageModal(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSubmitMessage}
              isLoading={sendMessageMutation.isPending}
              isDisabled={!messageSubject.trim() || !messageContent.trim()}
            >
              Send Message
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Strike Modal */}
      <Modal
        isOpen={showStrikeModal}
        onClose={() => setShowStrikeModal(false)}
        size="lg"
        classNames={{
          base: "bg-gray-800 text-white",
          header: "border-b border-gray-700",
          body: "py-6",
          footer: "border-t border-gray-700",
        }}
      >
        <ModalContent>
          <ModalHeader>
            Add Strike
            {selectedReport && (
              <span className="text-sm font-normal text-red-400 ml-2">
                ({selectedReport.reportedUserDisplayName})
              </span>
            )}
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-400 text-sm mb-4">
              This will add a strike to the user&apos;s account. After 3
              strikes, the user will be automatically banned.
            </p>
            <Textarea
              label="Reason for strike"
              value={strikeReason}
              onValueChange={setStrikeReason}
              minRows={2}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-gray-700/50",
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowStrikeModal(false)}>
              Cancel
            </Button>
            <Button
              color="warning"
              onPress={handleSubmitStrike}
              isLoading={addStrikeMutation.isPending}
              isDisabled={!strikeReason.trim()}
            >
              Add Strike
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ban User Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        size="lg"
        classNames={{
          base: "bg-gray-800 text-white",
          header: "border-b border-gray-700",
          body: "py-6",
          footer: "border-t border-gray-700",
        }}
      >
        <ModalContent>
          <ModalHeader>
            Ban User
            {selectedReport && (
              <span className="text-sm font-normal text-red-400 ml-2">
                ({selectedReport.reportedUserDisplayName})
              </span>
            )}
          </ModalHeader>
          <ModalBody>
            <p className="text-red-400 text-sm mb-4">
              Warning: This will immediately ban the user from Quiz Night Live.
              They will not be able to access the app.
            </p>
            <Textarea
              label="Reason for ban"
              value={banReason}
              onValueChange={setBanReason}
              minRows={2}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-gray-700/50",
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowBanModal(false)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleSubmitBan}
              isLoading={banUserMutation.isPending}
              isDisabled={!banReason.trim()}
            >
              Ban User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

interface ReportCardProps {
  report: Report;
  onStatusChange: (report: Report, status: ReportStatus) => void;
  onSendMessage: (report: Report) => void;
  onAddStrike: (report: Report) => void;
  onBanUser: (report: Report) => void;
  isUpdating: boolean;
}

function ReportCard({
  report,
  onStatusChange,
  onSendMessage,
  onAddStrike,
  onBanUser,
  isUpdating,
}: ReportCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-gray-700/30 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Chip color={STATUS_COLORS[report.status]} size="sm" variant="flat">
              {report.status}
            </Chip>
            <Chip color="default" size="sm" variant="flat">
              {REASON_LABELS[report.reason] || report.reason}
            </Chip>
            <Chip color="default" size="sm" variant="flat">
              {CONTEXT_LABELS[report.context] || report.context}
            </Chip>
          </div>
          <div className="text-white font-medium">
            <span className="text-red-400">
              {report.reportedUserDisplayName}
            </span>
            <span className="text-gray-400 mx-2">reported by</span>
            <span className="text-blue-400">{report.reporterDisplayName}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(report.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide" : "Details"}
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            onPress={() => onSendMessage(report)}
          >
            Message
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
          {report.description && (
            <div>
              <div className="text-xs text-gray-500 mb-1">
                Reporter&apos;s Description:
              </div>
              <div className="bg-gray-900/50 p-3 rounded text-gray-300 text-sm whitespace-pre-wrap">
                {report.description}
              </div>
            </div>
          )}

          {report.messageContent && (
            <div>
              <div className="text-xs text-gray-500 mb-1">
                Reported Message:
              </div>
              <div className="bg-gray-900/50 p-3 rounded text-gray-300 text-sm">
                {report.messageContent}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Update Status:</span>
            <Select
              size="sm"
              className="max-w-[150px]"
              selectedKeys={[report.status]}
              onSelectionChange={(keys) => {
                const status = Array.from(keys)[0] as ReportStatus;
                if (status && status !== report.status) {
                  onStatusChange(report, status);
                }
              }}
              isDisabled={isUpdating}
            >
              <SelectItem key="PENDING">Pending</SelectItem>
              <SelectItem key="REVIEWED">Reviewed</SelectItem>
              <SelectItem key="ACTIONED">Actioned</SelectItem>
              <SelectItem key="DISMISSED">Dismissed</SelectItem>
            </Select>
          </div>

          {/* Moderation Actions */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-gray-400">Take Action:</span>
            <Button
              size="sm"
              variant="flat"
              color="warning"
              onPress={() => onAddStrike(report)}
            >
              Add Strike
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={() => onBanUser(report)}
            >
              Ban User
            </Button>
          </div>

          {report.adminNotes && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Admin Notes:</div>
              <div className="text-gray-300 text-sm">{report.adminNotes}</div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <div>Report ID: {report.id}</div>
            <div>Reported User ID: {report.reportedUserId}</div>
            <div>Reporter ID: {report.reporterId}</div>
          </div>
        </div>
      )}
    </div>
  );
}
