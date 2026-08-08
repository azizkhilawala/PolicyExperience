import { useState, useEffect, useCallback } from 'react';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table, pixel } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Token } from '@astryxdesign/core/Token';
import { Spinner } from '@astryxdesign/core/Spinner';

import type { Service, ObjIpList, ObjLabelGroup, ObjVirtualService } from '../api/objects.js';
import {
  fetchServices, deleteService,
  fetchObjIpLists, deleteIpList,
  fetchObjLabelGroups, deleteLabelGroup,
  fetchObjVirtualServices, deleteVirtualService,
} from '../api/objects.js';
import { useLabels } from '../hooks/useLabels.js';
import { ServiceDialog } from '../features/objects/ServiceDialog.js';
import { IpListDialog } from '../features/objects/IpListDialog.js';
import { LabelGroupDialog } from '../features/objects/LabelGroupDialog.js';
import { VirtualServiceDialog } from '../features/objects/VirtualServiceDialog.js';

type ActiveTab = 'services' | 'ip-lists' | 'label-groups' | 'virtual-services';

// Table rows must satisfy Record<string, unknown>
type ServiceRow = Service & Record<string, unknown>;
type IpListRow = ObjIpList & Record<string, unknown>;
type LabelGroupRow = ObjLabelGroup & Record<string, unknown>;
type VirtualServiceRow = ObjVirtualService & Record<string, unknown>;

export default function ObjectsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('services');
  const labels = useLabels();

  // ─── Services state ───────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const [serviceDeleteError, setServiceDeleteError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try { setServices(await fetchServices()); }
    catch { /* empty */ }
    finally { setServicesLoading(false); }
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  // ─── IP Lists state ───────────────────────────────────────────────────────
  const [ipLists, setIpLists] = useState<ObjIpList[]>([]);
  const [ipListsLoading, setIpListsLoading] = useState(true);
  const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
  const [editingIpList, setEditingIpList] = useState<ObjIpList | undefined>(undefined);
  const [ipListDeleteError, setIpListDeleteError] = useState<string | null>(null);

  const loadIpLists = useCallback(async () => {
    setIpListsLoading(true);
    try { setIpLists(await fetchObjIpLists()); }
    catch { /* empty */ }
    finally { setIpListsLoading(false); }
  }, []);

  useEffect(() => { loadIpLists(); }, [loadIpLists]);

  // ─── Label Groups state ───────────────────────────────────────────────────
  const [labelGroups, setLabelGroups] = useState<ObjLabelGroup[]>([]);
  const [labelGroupsLoading, setLabelGroupsLoading] = useState(true);
  const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);
  const [editingLabelGroup, setEditingLabelGroup] = useState<ObjLabelGroup | undefined>(undefined);
  const [labelGroupDeleteError, setLabelGroupDeleteError] = useState<string | null>(null);

  const loadLabelGroups = useCallback(async () => {
    setLabelGroupsLoading(true);
    try { setLabelGroups(await fetchObjLabelGroups()); }
    catch { /* empty */ }
    finally { setLabelGroupsLoading(false); }
  }, []);

  useEffect(() => { loadLabelGroups(); }, [loadLabelGroups]);

  // ─── Virtual Services state ───────────────────────────────────────────────
  const [virtualServices, setVirtualServices] = useState<ObjVirtualService[]>([]);
  const [vsLoading, setVsLoading] = useState(true);
  const [vsDialogOpen, setVsDialogOpen] = useState(false);
  const [editingVs, setEditingVs] = useState<ObjVirtualService | undefined>(undefined);
  const [vsDeleteError, setVsDeleteError] = useState<string | null>(null);

  const loadVirtualServices = useCallback(async () => {
    setVsLoading(true);
    try { setVirtualServices(await fetchObjVirtualServices()); }
    catch { /* empty */ }
    finally { setVsLoading(false); }
  }, []);

  useEffect(() => { loadVirtualServices(); }, [loadVirtualServices]);

  // ─── Delete handlers ─────────────────────────────────────────────────────
  const handleDeleteService = useCallback(async (id: string) => {
    try { await deleteService(id); setServiceDeleteError(null); loadServices(); }
    catch (e) { setServiceDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadServices]);

  const handleDeleteIpList = useCallback(async (id: string) => {
    try { await deleteIpList(id); setIpListDeleteError(null); loadIpLists(); }
    catch (e) { setIpListDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadIpLists]);

  const handleDeleteLabelGroup = useCallback(async (id: string) => {
    try { await deleteLabelGroup(id); setLabelGroupDeleteError(null); loadLabelGroups(); }
    catch (e) { setLabelGroupDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadLabelGroups]);

  const handleDeleteVs = useCallback(async (id: string) => {
    try { await deleteVirtualService(id); setVsDeleteError(null); loadVirtualServices(); }
    catch (e) { setVsDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadVirtualServices]);

  // ─── Label name resolver ─────────────────────────────────────────────────
  const resolveLabelName = useCallback((id: string): string => {
    const label = labels.find((l) => l.id === id);
    return label ? `${label.key}=${label.value}` : id;
  }, [labels]);

  // ─── Column definitions ───────────────────────────────────────────────────
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
      header: '',
      width: pixel(60),
      renderCell: (row: ServiceRow) => (
        <MoreMenu items={[
          { label: 'Edit', onClick: () => { setEditingService(row as Service); setServiceDialogOpen(true); } },
          { label: 'Delete', onClick: () => handleDeleteService(row.id as string) },
        ]} />
      ),
    },
  ];

  const ipListColumns = [
    { key: 'name', header: 'Name' },
    { key: 'cidr', header: 'CIDR' },
    { key: 'description', header: 'Description' },
    {
      key: 'actions',
      header: '',
      width: pixel(60),
      renderCell: (row: IpListRow) => (
        <MoreMenu items={[
          { label: 'Edit', onClick: () => { setEditingIpList(row as ObjIpList); setIpListDialogOpen(true); } },
          { label: 'Delete', onClick: () => handleDeleteIpList(row.id as string) },
        ]} />
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
      header: '',
      width: pixel(60),
      renderCell: (row: LabelGroupRow) => (
        <MoreMenu items={[
          { label: 'Edit', onClick: () => { setEditingLabelGroup(row as ObjLabelGroup); setLabelGroupDialogOpen(true); } },
          { label: 'Delete', onClick: () => handleDeleteLabelGroup(row.id as string) },
        ]} />
      ),
    },
  ];

  const virtualServiceColumns = [
    { key: 'name', header: 'Name' },
    { key: 'port', header: 'Port' },
    { key: 'protocol', header: 'Protocol' },
    {
      key: 'actions',
      header: '',
      width: pixel(60),
      renderCell: (row: VirtualServiceRow) => (
        <MoreMenu items={[
          { label: 'Edit', onClick: () => { setEditingVs(row as ObjVirtualService); setVsDialogOpen(true); } },
          { label: 'Delete', onClick: () => handleDeleteVs(row.id as string) },
        ]} />
      ),
    },
  ];

  return (
    <VStack gap={3} padding={4}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Policy Objects</h1>

      <TabList value={activeTab} onChange={(v) => setActiveTab(v as ActiveTab)}>
        <Tab value="services" label="Services" />
        <Tab value="ip-lists" label="IP Lists" />
        <Tab value="label-groups" label="Label Groups" />
        <Tab value="virtual-services" label="Virtual Services" />
      </TabList>

      {/* ─── Services tab ─────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create Service"
              variant="primary"
              onClick={() => { setEditingService(undefined); setServiceDialogOpen(true); }}
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
              data={services as ServiceRow[]}
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

      {/* ─── IP Lists tab ─────────────────────────────────────────────────── */}
      {activeTab === 'ip-lists' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create IP List"
              variant="primary"
              onClick={() => { setEditingIpList(undefined); setIpListDialogOpen(true); }}
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
              data={ipLists as IpListRow[]}
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

      {/* ─── Label Groups tab ─────────────────────────────────────────────── */}
      {activeTab === 'label-groups' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create Label Group"
              variant="primary"
              onClick={() => { setEditingLabelGroup(undefined); setLabelGroupDialogOpen(true); }}
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
              data={labelGroups as LabelGroupRow[]}
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

      {/* ─── Virtual Services tab ─────────────────────────────────────────── */}
      {activeTab === 'virtual-services' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button
              label="+ Create Virtual Service"
              variant="primary"
              onClick={() => { setEditingVs(undefined); setVsDialogOpen(true); }}
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
              data={virtualServices as VirtualServiceRow[]}
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
    </VStack>
  );
}
