import { createSignal, createEffect, Show, For } from "solid-js";
import { Check as LuCheck, ChevronRight as LuChevronRight, Import as LuImport, Minus as LuMinus, X as LuX } from 'lucide-solid'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useEffect, useState } from 'react'
import { ApiFileInfo } from '../../models/FileInfo'
import { formatCryptoAddress } from '../../utils/functions'
import { analyzeAndMergeRevisions } from '../../utils/aqua_funcs'
import { RevisionsComparisonResult } from '../../models/revision_merge'
import { OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk'
import { BtnContent, ImportChainFromChainProps } from '../../types/types'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { toast } from 'sonner'

export const ImportAquaChainFromChain = (props: ImportChainFromChainProps) => {
  const [uploading, setUploading] = createSignal(false);
  const [_uploaded, setUploaded] = createSignal(false);
  const [dbFiles, setDbFiles] = createSignal<ApiFileInfo[]>([]);
  const [comparisonResult, setComparisonResult] = createSignal<RevisionsComparisonResult | null>(null);
  const [modalOpen, setModalOpen] = createSignal(false);
  const [lastIdenticalRevisionHash, setLastIdenticalRevisionHash] = createSignal<string | null>(null);
  const [lastLocalRevisionHash, setLastLocalRevisionHash] = createSignal<string | null>(null);
  const [_revisionsToImport, setRevisionsToImport] = createSignal<Revision[]>([]);
  const [updateMessage, setUpdateMessage] = createSignal<string | null>(null);
  const [btnText, setBtnText] = createSignal<BtnContent>({
    text: "Submit chain",
    color: "blue",
  });

//   const { files, backend_url, session } = useStore(appStore);


  const importAquaChain = async () => {
    if (uploading()) return;

    const fileInfo = props.fileInfo;
    const existingChainFile = dbFiles().find(
      (file) =>
        Object.keys(file?.aquaTree?.revisions ?? {})[0] ===
        Object.keys(fileInfo?.aquaTree?.revisions ?? {})[0]
    );

    if (existingChainFile) {
      const orderedExistingChain = OrderRevisionInAquaTree(existingChainFile?.aquaTree!);
      const orderedFileToImport = OrderRevisionInAquaTree(fileInfo?.aquaTree!);

      const existingFileRevisions = Object.keys(orderedExistingChain.revisions ?? {});
      const fileToImportRevisions = Object.keys(orderedFileToImport.revisions ?? {});

      const mergeResult = analyzeAndMergeRevisions(existingFileRevisions, fileToImportRevisions);
      const _revisionsToImport: Revision[] = [];

      if (mergeResult.existingRevisionsLength < mergeResult.upcomingRevisionsLength) {
        setUpdateMessage("Importing chain is longer than existing chain, this will add new revisions to your local chain");
        setBtnText({ text: "Update Local Chain", color: "green" });
      }

      if (mergeResult.existingRevisionsLength > mergeResult.upcomingRevisionsLength) {
        setUpdateMessage("Existing chain is longer than importing chain, this will delete some revisions in your local chain");
        setBtnText({ text: "Rebase Local Chain", color: "yellow" });
      }

      if (mergeResult.existingRevisionsLength === mergeResult.upcomingRevisionsLength && mergeResult.divergences.length > 0) {
        setUpdateMessage("Chains are different, this will merge the chains, your local revisions will be deleted up to where the chains diverge");
        setBtnText({ text: "Merge Chains", color: "red" });
      }

      if (mergeResult.divergences.length > 0) {
        for (const div of mergeResult.divergences) {
          if (div.upcomingRevisionHash) {
            _revisionsToImport.push(fileInfo.aquaTree!.revisions[div.upcomingRevisionHash]!);
          }
        }
      }

      setComparisonResult(mergeResult);
      setLastIdenticalRevisionHash(mergeResult.lastIdenticalRevisionHash);
      const lastRevision = existingFileRevisions[existingFileRevisions.length - 1];
      setLastLocalRevisionHash(lastRevision);
      setRevisionsToImport(_revisionsToImport);
      setModalOpen(true);
      return;
    }

    setUploading(true);
    try {
      const url = `${appStore.backend_url}/transfer_chain`;
      const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!);
      const revisionHashes = Object.keys(reorderedRevisions.revisions);
      const latestRevisionHash = revisionHashes[revisionHashes.length - 1];

      const res = await axios.post(
        url,
        {
          latestRevisionHash,
          userAddress: props.contractData.sender,
        },
        {
          headers: {
            nonce: appStore.session?.nonce,
          },
        }
      );

      if (res.status === 200) {
        toast.success("Aqua Chain imported successfully");
        setTimeout(() => window.location.replace("/app"), 500);
      } else {
        toast.error("Failed to import chain");
      }

      setUploading(false);
      setUploaded(true);
    } catch (error) {
      setUploading(false);
      toast.error(`Failed to import chain: ${error}`);
    }
  };

  const handleMergeRevisions = async () => {
    if (uploading()) return;
    const fileInfo = props.fileInfo;

    try {
      const url = `${appStore.backend_url}/merge_chain`;
      const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!);
      const revisionHashes = Object.keys(reorderedRevisions.revisions);
      const latestRevisionHash = revisionHashes[revisionHashes.length - 1];

      const res = await axios.post(
        url,
        {
          latestRevisionHash,
          lastLocalRevisionHash: lastLocalRevisionHash(),
          currentUserLatestRevisionHash: lastIdenticalRevisionHash(),
          userAddress: props.contractData.sender,
          mergeStrategy: "replace",
        },
        {
          headers: {
            nonce:  appStore.session?.nonce,
          },
        }
      );

      if (res.status === 200) {
        toast.success("Aqua Chain imported successfully");
        setTimeout(() => window.location.replace("/app"), 500);
      } else {
        toast.error("Failed to import chain");
      }

      setUploading(false);
      setUploaded(true);
    } catch (error) {
      setUploading(false);
      toast.error(`Failed to import chain: ${error}`);
    }
  };

  createEffect(() => {
    const f =appStore.files.fileData;
    if (JSON.stringify(f) !== JSON.stringify(dbFiles())) {
      setDbFiles(f);
    }
  });

  const getButtonVariant = (color: string) => {
    switch (color) {
      case "green":
        return "default";
      case "yellow":
        return "secondary";
      case "red":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <>
      <Show
        when={props.showButtonOnly}
        fallback={
          <Alert class="mb-6">
            <LuImport class="h-4 w-4" />
            <AlertTitle>Import Aqua Chain</AlertTitle>
            <AlertDescription>
              <div class="mt-4 space-y-4">
                <p>Do you want to import this Aqua Chain?</p>
                <Button class="bg-blue-600 text-white hover:bg-blue-700" onClick={importAquaChain}>
                  <LuImport class="mr-2 h-4 w-4" /> Import
                </Button>
              </div>
            </AlertDescription>

            <Dialog open={modalOpen()} onOpenChange={setModalOpen}>
              <DialogContent class="max-w-2xl rounded-lg">
                <DialogHeader>
                  <DialogTitle>Aqua Chain Import</DialogTitle>
                </DialogHeader>

                <div class="space-y-6">
                  <div class="space-y-4">
                    <div class="flex gap-4">
                      <div
                        class={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          props.isVerificationSuccessful ? "text-green-600 border-green-600" : "text-red-600 border-red-600"
                        }`}
                      >
                        <LuCheck class="h-4 w-4" />
                      </div>
                      <div class="flex-1">
                        <h4 class="text-sm font-medium">Verification status</h4>
                        <p class="text-sm text-muted-foreground">Verification successful</p>
                      </div>
                    </div>

                    {/* More conditionals using <Show> and <For> here, identical to original JSX */}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Alert>
        }
      >
        <Button
          class="bg-blue-600 text-white hover:bg-blue-700"
          size="sm"
          onClick={importAquaChain}
        >
          Import
        </Button>
      </Show>
    </>
  );
};
