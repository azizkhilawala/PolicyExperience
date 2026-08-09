import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table, pixel } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Token } from '@astryxdesign/core/Token';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Heading } from '@astryxdesign/core/Heading';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { TextInput } from '@astryxdesign/core/TextInput';

import type { Service, ObjIpList, ObjLabelGroup, ObjVirtualService } from '../api/objects.js';
import {
  fetchServices,
  deleteService,
  fetchObjIpLists,
  deleteIpList,
  fetchObjLabelGroups,
  deleteLabelGroup,
  fetchObjVirtualServices,
  deleteVirtualService,
} from '../api/objects.js';
import { useLabels } from '../hooks/useLabels.js';
import { ServiceDialog } from '../features/objects/ServiceDialog.js';
import { IpListDialog } from '../features/objects/IpListDialog.js';
import { LabelGroupDialog } from '../features/objects/LabelGroupDialog.js';
import { VirtualServiceDialog } from '../features/objects/VirtualServiceDialog.js';

type ActiveTab = 'services' | 'ip-lists' | 'label-groups' | 'virtual-services';

type ServiceRow = Service & Record<string, unknown>;
type IpListRow = ObjIpList & Record<string, unknown>;
type LabelGroupRow = ObjLabelGroup & Record<string, unknown>;
type VirtualServiceRow = ObjVirtualService & Record<string, unknown>;

export default function ObjectsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const labels = useLabels();

  // Track which tabs have been visited so we only fetch on first visit
  const visitedTabs = useRef<Set<ActiveTab>>(new Set(['services']));

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const [serviceDeleteError, setServiceDeleteError] = useState<string | null>(null);

  const [ipLists, setIpLists] = useState<ObjIpList[]>([]);
  const [ipListsLoading, setIpListsLoading] = useState(false);
  const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
  const [editingIpList, setEditingIpList] = useState<ObjIpList | undefined>(undefined);
  const [ipListDeleteError, setIpListDeleteError] = useState<string | null>(null);

  const [labelGroups, setLabelGroups] = useState<ObjLabelGroup[]>([]);
  const [labelGroupsLoading, setLabelGroupsLoading] = useState(false);
  const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);
  const [editingLabelGroup, setEditingLabelGroup] = useState<ObjLabelGroup | undefined>(undefined);
  const [labelGroupDeleteError, setLabelGroupDeleteError] = useState<string | null>(null);

  const [virtualServices, setVirtualServices] = useState<ObjVirtualService[]>([]);
  const [vsLoading, setVsLoading] = useState(false);
  const [vsDialogOpen, setVsDialogOpen] = useState(false);
  const [editingVs, setEditingVs] = useState<ObjVirtualService | undefined>(undefined);
  const [vsDeleteError, setVsDeleteError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      setServices(await fetchServices());
    } catch {
      /* empty */
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadIpLists = useCallback(async () => {
    setIpListsLoading(true);
    try {
      setIpLists(await fetchObjIpLists());
    } catch {
      /* empty */
    } finally {
      setIpListsLoading(false);
    }
  }, []);

  const loadLabelGroups = useCallback(async () => {
    setLabelGroupsLoading(true);
    try {
      setLabelGroups(await fetchObjLabelGroups());
    } catch {
      /* empty */
    } finally {
      setLabelGroupsLoading(false);
    }
  }, []);

  const loadVirtualServices = useCallback(async () => {
    setVsLoading(true);
    try {
      setVirtualServices(await fetchObjVirtualServices());
    } catch {
      /* empty */
    } finally {
      setVsLoading(false);
    }
  }, []);

  // Load services on mount (default tab)
  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Lazy-load data when switching tabs
  useEffect(() => {
    if (visitedTabs.current.has(activeTab)) return;
    visitedTabs.current.add(activeTab);
    if (activeTab === 'ip-lists') loadIpLists();
    if (activeTab === 'label-groups') loadLabelGroups();
    if (activeTab === 'virtual-services') loadVirtualServices();
  }, [activeTab, loadIpLists, loadLabelGroups, loadVirtualServices]);

  // Clear search when switching tabs
  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v as ActiveTab);
    setSearchQuery('');
  }, []);

  // Delete handlers with confirmation
  const handleDeleteService = useCallback(
    (row: Service) => {
      setDeleteConfirm({
        name: row.name,
        onConfirm: async () => {
          try {
            await deleteService(row.id);
            setServiceDeleteError(null);
            loadServices();
          } catch (e) {
            setServiceDeleteError(e instanceof Error ? e.message : 'Delete failed');
          }
        },
      });
    },
    [loadServices],
  );

  const handleDeleteIpList = useCallback(
    (row: ObjIpList) => {
      setDeleteConfirm({
        name: row.name,
        onConfirm: async () => {
          try {
            await deleteIpList(row.id);
            setIpListDeleteError(null);
            loadIpLists();
          } catch (e) {
            setIpListDeleteError(e instanceof Error ? e.message : 'Delete failed');
          }
        },
      });
    },
    [loadIpLists],
  );

  const handleDeleteLabelGroup = useCallback(
    (row: ObjLabelGroup) => {
      setDeleteConfirm({
        name: row.name,
        onConfirm: async () => {
          try {
            await deleteLabelGroup(row.id);
            setLabelGroupDeleteError(null);
            loadLabelGroups();
          } catch (e) {
            setLabelGroupDeleteError(e instanceof Error ? e.message : 'Delete failed');
          }
        },
      });
    },
    [loadLabelGroups],
  );

  const handleDeleteVs = useCallback(
    (row: ObjVirtualService) => {
      setDeleteConfirm({
        name: row.name,
        onConfirm: async () => {
          try {
            await deleteVirtualService(row.id);
            setVsDeleteError(null);
            loadVirtualServices();
          } catch (e) {
            setVsDeleteError(e instanceof Error ? e.message : 'Delete failed');
          }
        },
      });
    },
    [loadVirtualServices],
  );

  const resolveLabelName = useCallback(
    (id: string): string => {
      const label = labels.find((l) => l.id === id);
      return label ? `${label.key}=${label.value}` : id;
    },
    [labels],
  );

  // Filtered data based on search query
  const query = searchQuery.toLowerCase();

  const filteredServices = useMemo(
    () =>
      query
        ? services.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.protocol.toLowerCase().includes(query) ||
              String(s.port).includes(query) ||
              s.description?.toLowerCase().includes(query),
          )
        : services,
    [services, query],
  );

  const filteredIpLists = useMemo(
    () =>
      query
        ? ipLists.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.cidr.toLowerCase().includes(query) ||
              s.description?.toLowerCase().includes(query),
          )
        : ipLists,
    [ipLists, query],
  );

  const filteredLabelGroups = useMemo(
    () =>
      query
        ? labelGroups.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.label_ids.some((lid) => resolveLabelName(lid).toLowerCase().includes(query)),
          )
        : labelGroups,
    [labelGroups, query, resolveLabelName],
  );

  const filteredVirtualServices = useMemo(
    () =>
      query
        ? virtualServices.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.protocol.toLowerCase().includes(query) ||
              String(s.port).includes(query),
          )
        : virtualServices,
    [virtualServices, query],
  );

  const serviceColumns = [
    { key: 'name', header: 'Name' },
    {
      key: 'portRange',
      header: 'Port / Range',
      renderCell: (row: ServiceRow) =>
        row.to_port != null ? `${String(row.port)}–${String(row.to_port)}` : String(row.port),
    },
    { key: 'protocol', header: 'Protocol' },
    { key: 'description', header: 'Description' },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(60),
      renderCell: (row: ServiceRow) => (
        <MoreMenu
          items={[
            {
              label: 'Edit',
              onClick: () => {
                setEditingService(row as Service);
                setServiceDialogOpen(true);
              },
            },
            { label: 'Delete', onClick: () => handleDeleteService(row as Service) },
          ]}
        />
      ),
    },
  ];

  const ipListColumns = [
    { key: 'name', header: 'Name' },
    { key: 'cidr', header: 'CIDR' },
    { key: 'description', header: 'Description' },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(60),
      renderCell: (row: IpListRow) => (
        <MoreMenu
          items={[
            {
              label: 'Edit',
              onClick: () => {
                setEditingIpList(row as ObjIpList);
                setIpListDialogOpen(true);
              },
            },
            { label: 'Delete', onClick: () => handleDeleteIpList(row as ObjIpList) },
          ]}
        />
      ),
    },
  ];

  const labelGroupColumns = [
    { key: 'name', header: 'Name' },
    {
      key: 'label_ids',
      header: 'Labels',
      renderCell: (row: LabelGroupRow) => (
        <HStack gap={0.5} wrap="wrap">
          {(row.label_ids as string[]).map((lid) => (
            <Token key={lid} label={resolveLabelName(lid)} color="purple" size="sm" />
          ))}
        </HStack>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(60),
      renderCell: (row: LabelGroupRow) => (
        <MoreMenu
          items={[
            {
              label: 'Edit',
              onClick: () => {
                setEditingLabelGroup(row as ObjLabelGroup);
                setLabelGroupDialogOpen(true);
              },
            },
            { label: 'Delete', onClick: () => handleDeleteLabelGroup(row as ObjLabelGroup) },
          ]}
        />
      ),
    },
  ];

  const virtualServiceColumns = [
    { key: 'name', header: 'Name' },
    { key: 'port', header: 'Port' },
    { key: 'protocol', header: 'Protocol' },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(60),
      renderCell: (row: VirtualServiceRow) => (
        <MoreMenu
          items={[
            {
              label: 'Edit',
              onClick: () => {
                setEditingVs(row as ObjVirtualService);
                setVsDialogOpen(true);
              },
            },
            { label: 'Delete', onClick: () => handleDeleteVs(row as ObjVirtualService) },
          ]}
        />
      ),
    },
  ];

  return (
    <VStack gap={3} padding={4}>
      <Heading level={1}>Policy Objects</Heading>

      <TabList value={activeTab} onChange={handleTabChange}>
        <Tab value="services" label="Services" />
        <Tab value="ip-lists" label="IP Lists" />
        <Tab value="label-groups" label="Label Groups" />
        <Tab value="virtual-services" label="Virtual Services" />
      </TabList>

      <TextInput
        label="Search"
        isLabelHidden
        placeholder={`Search ${activeTab.replace(/-/g, ' ')}…`}
        value={searchQuery}
        onChange={setSearchQuery}
        hasClear
        size="sm"
        width="100%"
      />

      {activeTab === 'services' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create Service"
              variant="primary"
              onClick={() => {
                setEditingService(undefined);
                setServiceDialogOpen(true);
              }}
            />
          </HStack>
          {serviceDeleteError && (
            <Banner
              status="error"
              title={serviceDeleteError}
              isDismissable
              onDismiss={() => setServiceDeleteError(null)}
            />
          )}
          {servicesLoading ? (
            <Spinner label="Loading services…" size="lg" />
          ) : (
            <Table<ServiceRow>
              columns={serviceColumns}
              data={filteredServices as ServiceRow[]}
              idKey="id"
            />
          )}
          <ServiceDialog
            isOpen={serviceDialogOpen}
            onClose={() => setServiceDialogOpen(false)}
            onSaved={() => loadServices()}
            service={editingService}
          />
        </VStack>
      )}

      {activeTab === 'ip-lists' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create IP List"
              variant="primary"
              onClick={() => {
                setEditingIpList(undefined);
                setIpListDialogOpen(true);
              }}
            />
          </HStack>
          {ipListDeleteError && (
            <Banner
              status="error"
              title={ipListDeleteError}
              isDismissable
              onDismiss={() => setIpListDeleteError(null)}
            />
          )}
          {ipListsLoading ? (
            <Spinner label="Loading IP lists…" size="lg" />
          ) : (
            <Table<IpListRow>
              columns={ipListColumns}
              data={filteredIpLists as IpListRow[]}
              idKey="id"
            />
          )}
          <IpListDialog
            isOpen={ipListDialogOpen}
            onClose={() => setIpListDialogOpen(false)}
            onSaved={() => loadIpLists()}
            ipList={editingIpList}
          />
        </VStack>
      )}

      {activeTab === 'label-groups' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create Label Group"
              variant="primary"
              onClick={() => {
                setEditingLabelGroup(undefined);
                setLabelGroupDialogOpen(true);
              }}
            />
          </HStack>
          {labelGroupDeleteError && (
            <Banner
              status="error"
              title={labelGroupDeleteError}
              isDismissable
              onDismiss={() => setLabelGroupDeleteError(null)}
            />
          )}
          {labelGroupsLoading ? (
            <Spinner label="Loading label groups…" size="lg" />
          ) : (
            <Table<LabelGroupRow>
              columns={labelGroupColumns}
              data={filteredLabelGroups as LabelGroupRow[]}
              idKey="id"
            />
          )}
          <LabelGroupDialog
            isOpen={labelGroupDialogOpen}
            onClose={() => setLabelGroupDialogOpen(false)}
            onSaved={() => loadLabelGroups()}
            labelGroup={editingLabelGroup}
          />
        </VStack>
      )}

      {activeTab === 'virtual-services' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create Virtual Service"
              variant="primary"
              onClick={() => {
                setEditingVs(undefined);
                setVsDialogOpen(true);
              }}
            />
          </HStack>
          {vsDeleteError && (
            <Banner
              status="error"
              title={vsDeleteError}
              isDismissable
              onDismiss={() => setVsDeleteError(null)}
            />
          )}
          {vsLoading ? (
            <Spinner label="Loading virtual services…" size="lg" />
          ) : (
            <Table<VirtualServiceRow>
              columns={virtualServiceColumns}
              data={filteredVirtualServices as VirtualServiceRow[]}
              idKey="id"
            />
          )}
          <VirtualServiceDialog
            isOpen={vsDialogOpen}
            onClose={() => setVsDialogOpen(false)}
            onSaved={() => loadVirtualServices()}
            virtualService={editingVs}
          />
        </VStack>
      )}

      <AlertDialog
        isOpen={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={`Delete "${deleteConfirm?.name ?? ''}"?`}
        description="This action cannot be undone. Any rules referencing this object may also be affected."
        actionLabel="Delete"
        isActionLoading={deleteLoading}
        onAction={async () => {
          if (!deleteConfirm) return;
          setDeleteLoading(true);
          await deleteConfirm.onConfirm();
          setDeleteLoading(false);
          setDeleteConfirm(null);
        }}
      />
    </VStack>
  );
}
