import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@astryxdesign/core/Table';
import { Token } from '@astryxdesign/core/Token';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Section } from '@astryxdesign/core/Section';
import type { ImpactResult } from '../../api/impact.js';
import { LabelTokens } from '../../components/LabelTokens.js';

const ENFORCEMENT_COLOR: Record<string, 'gray' | 'blue' | 'orange' | 'green'> = {
  idle: 'gray',
  visibility_only: 'blue',
  selective: 'orange',
  full: 'green',
};

const ENFORCEMENT_LABEL: Record<string, string> = {
  idle: 'Idle',
  visibility_only: 'Visibility Only',
  selective: 'Selective',
  full: 'Full',
};

interface ImpactDialogProps {
  result: ImpactResult;
  isOpen: boolean;
  onClose: () => void;
}

export function ImpactDialog({ result, isOpen, onClose }: ImpactDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      purpose="informational"
      width={800}
    >
      <DialogHeader
        title={`Impacted Workloads (${result.total})`}
        onOpenChange={(open) => { if (!open) onClose(); }}
      />

      <VStack gap={3} padding={4} style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <Section title="Label Breakdown">
          <HStack gap={2} wrap="wrap">
            {Object.entries(result.by_label).map(([key, values]) => (
              <VStack key={key} gap={0.5}>
                <Text type="supporting" weight="medium">
                  {key}
                </Text>
                <HStack gap={0.5} wrap="wrap">
                  {Object.entries(values).map(([value, count]) => (
                    <Token
                      key={`${key}-${value}`}
                      label={`${value} (${count})`}
                      color="default"
                      size="sm"
                    />
                  ))}
                </HStack>
              </VStack>
            ))}
          </HStack>
        </Section>

        <Section title="Workloads">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Labels</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Enforcement</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.workloads.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.name}</TableCell>
                  <TableCell>
                    <Token
                      label={w.type === 'k8s_pod' ? 'K8s Pod' : 'VM'}
                      color={w.type === 'k8s_pod' ? 'teal' : 'purple'}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <LabelTokens labels={w.labels} size="sm" />
                  </TableCell>
                  <TableCell>
                    <HStack gap={1} vAlign="center">
                      <StatusDot
                        variant={w.managed ? (w.online ? 'success' : 'error') : 'warning'}
                        label={w.managed ? (w.online ? 'Online' : 'Offline') : 'Unmanaged'}
                      />
                      <Text type="supporting">
                        {w.managed ? (w.online ? 'Online' : 'Offline') : 'Unmanaged'}
                      </Text>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Token
                      label={ENFORCEMENT_LABEL[w.enforcement_mode] ?? w.enforcement_mode}
                      color={ENFORCEMENT_COLOR[w.enforcement_mode] ?? 'gray'}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </VStack>
    </Dialog>
  );
}
