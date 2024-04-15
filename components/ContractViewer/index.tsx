import React, { useState, useEffect, useCallback } from 'react'

import { isValidAddress } from '@ethereumjs/util'
import { TextField } from '@mui/material'
import Box from '@mui/material/Box'
import { useRouter } from 'next/router'
import { ContractArtifact } from 'types/ast'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from 'components/ui/ResizeablePanel'

import ContractCodeEditor from './ContractCodeEditor'
import ContractTreeView from './ContractTreeView'
import {
  DeploymentsCollection,
  DeploymentsContext,
  DeploymentInfo,
  useDeployments,
} from './DeploymentInfo'
import Header from './Header'

const ContractViewerInner = () => {
  // address bar routing
  const router = useRouter()

  const {
    deployments,
    selectedDeployment,
    setSelectedDeployment,
    loadDeployment,
  } = useDeployments()

  const [status, setStatus] = useState('')
  const [codePeekLocation, setCodePeekLocation] = useState<any>({})

  const tryLoadContract = async (address: string, context?: DeploymentInfo) => {
    setStatus('loading...')

    return loadDeployment(address, context)
      .then(() => {
        setStatus('loaded')
      })
      .catch((err: any) => {
        setStatus('failed to load contract\n' + err)
      })
  }

  const updateRoute = () => {
    const query: any = {}
    const addresses = Object.values(deployments)
      .map((c) => c.address)
      .join(',')

    if (addresses) {
      query.address = addresses
      router.replace({ query })
    }
  }

  const tryLoadAddress = useCallback(
    (address: string, invalidateRoute: boolean) => {
      if (!isValidAddress(address)) {
        if (address) {
          setStatus('invalid address format: ' + address)
        }
        return
      }

      address = address.toLowerCase()
      if (deployments[address]) {
        return
      }

      tryLoadContract(address).then(() => {
        if (invalidateRoute) {
          updateRoute()
        }
      })
    },
    [deployments, tryLoadContract, updateRoute],
  )

  // load contract from url once router is ready
  useEffect(() => {
    if (!router.isReady) {
      return
    }

    const addresses = ((router.query.address as string) || '').split(',')
    for (const addr of addresses) {
      tryLoadAddress(addr, false)
    }
    // NOTE: do not add dependencies here or it will cause an infinite loop (idk why)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // TODO: fix router to support contract implementations added by user
  // (currently only top-level contracts are supported)
  useEffect(() => {
    if (router.isReady) {
      updateRoute()
    }
    // NOTE: do not add dependencies here or it will cause an infinite loop (idk why)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-[800px] dark:bg-black-800 dark:border-black-500 dark:text-gray-100">
      <ResizablePanelGroup id="resizable-grp-1" direction="horizontal">
        {/* contract tree view panel */}
        <ResizablePanel defaultSize={40}>
          {/* tree view header & search box */}
          <Header>
            <TextField
              size="small"
              label="address"
              className="bg-gray-200 dark:invert w-[350px] font-mono"
              variant="outlined"
              onInput={(e: any) => tryLoadAddress(e.target.value.trim(), true)}
            />
          </Header>

          {/* tree view */}
          <ContractTreeView
            deployments={Object.values(deployments)}
            onSelect={(
              contract: DeploymentInfo,
              artifact: ContractArtifact,
            ) => {
              if (!contract?.address) {
                console.warn('missing contract')
                return
              }

              const addr = contract.address
              if (addr != selectedDeployment?.address) {
                setSelectedDeployment(contract)
              }

              if (artifact?.node?.loc) {
                setCodePeekLocation(artifact.node.loc.start)
              }
            }}
          />
        </ResizablePanel>

        {/* horizontal handle */}
        <ResizableHandle
          id="resizable-handle-1"
          className="border-2 dark:border-gray-600"
        />

        {/* code editor panel */}
        <ResizablePanel defaultSize={60}>
          {/* code editor header */}
          <Header>
            <p className="font-semibold">
              {selectedDeployment?.etherscanInfo?.ContractName}
            </p>
            <span className="text-xs">{selectedDeployment?.address}</span>
          </Header>

          {/* code editor */}
          <ContractCodeEditor
            code={selectedDeployment?.code}
            line={codePeekLocation.line}
            column={codePeekLocation.column + 1}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* bottom panel: console & metadata information panel */}
      <Header className="py-2 px-4 text-sm flex flex-col gap-2">
        <Box className="whitespace-nowrap">
          {/* {reqCount > 0 && <CircularProgress />} {status} */}
          {status}
        </Box>
        {/* <LinearProgress
          sx={{ visibility: reqCount > 0 ? 'visible' : 'hidden' }}
        /> */}
        {/* {error && <p>Error! {error}</p>} */}
        {/* <p>Data: {data}</p> */}

        {/* <p>*Additional metadata info should go here*</p> */}
        {/* TODO: try moving this inside the treeview? */}
      </Header>

      <sub>
        Alpha version - <a href="https://twitter.com/smlxldotio">@smlxldotio</a>{' '}
        for feature requests or bug fixes
      </sub>
    </div>
  )
}

const ContractViewer = () => {
  const [deployments, setDeployments] = useState<DeploymentsCollection>({})

  return (
    <DeploymentsContext.Provider value={{ deployments, setDeployments }}>
      <ContractViewerInner />
    </DeploymentsContext.Provider>
  )
}

export default ContractViewer