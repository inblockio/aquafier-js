import { FiAlertCircle, FiCalendar, FiCheck, FiCheckCircle, FiCheckSquare, FiFileText, FiInfo } from 'react-icons/fi'
import { BsCheckCircleFill } from 'react-icons/bs'
import { IContractWorkFlowFirstPage } from '../../../types/contract_workflow'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import { cn } from '../../../lib/utils'
import WalletAdrressClaim from '@/pages/v2_claims_workflow/WalletAdrressClaim'

const ContractSummaryDetails = ({ data, goToSecondPage, isValidTree }: IContractWorkFlowFirstPage) => {
      const mockContractData = data

      const formatDateTime = (dateString: string) => {
            // return format(new Date(dateString), "MMM d, yyyy, HH:mm:ss a");
            return dateString
      }

      const getInformation = (activityType: 'created' | 'signed' | 'completed') => {
            switch (activityType) {
                  case 'created':
                        return {
                              title: 'Workflow Created',
                              icon: FiFileText,
                              color: 'blue',
                        }
                  case 'signed':
                        return {
                              title: 'Signature Detected',
                              icon: FiCheckCircle,
                              color: 'green',
                        }
                  case 'completed':
                        return {
                              title: 'Workflow Completed',
                              icon: FiCheckSquare,
                              color: 'green',
                        }
                  default:
                        return {
                              title: 'Default',
                              icon: FiInfo,
                              color: 'gray',
                        }
            }
      }

      const CustomDivider = ({ mb, mt }: { mb: string | number; mt: string | number }) => {
            return <div className="w-full h-px bg-gray-200 dark:bg-gray-800" style={{ marginTop: mt, marginBottom: mb }} />
      }

      const getBgColorBasedOnVerificationStatus = () => {
            if (isValidTree === 'pending') {
                  return 'bg-gray-50'
            } else if (isValidTree === 'successful') {
                  return 'bg-green-50'
            } else if (isValidTree === 'failed') {
                  return 'bg-red-50'
            }
            return 'bg-gray-50'
      }

      return (
            <div className="flex flex-col rounded-lg shadow-lg pt-8 overflow-hidden gap-2">
                  <div className="px-2 md:px-8 flex justify-between items-center">
                        <div className="flex items-center space-x-2 flex-wrap">
                              <h2 className="text-sm md:text-xl font-semibold">{mockContractData.name}</h2>
                              <Badge
                                    variant={mockContractData.status === 'pending' ? 'outline' : 'default'}
                                    className={cn('rounded-full', mockContractData.status === 'pending' ? 'text-yellow-600 border-yellow-400' : 'bg-green-100 text-green-800 hover:bg-green-100')}
                              >
                                    {mockContractData.status === 'pending' && <FiInfo className="mr-1 h-3 w-3" />}
                                    {mockContractData.status === 'completed' && <FiCheck className="mr-1 h-3 w-3" />}
                                    {mockContractData.status}
                              </Badge>
                        </div>
                       
                  </div>

                  <div className="flex items-center px-2 md:px-8">
                        <FiCalendar className="text-gray-500 mr-2" />
                        <p className="text-gray-500 text-xs">Created on {mockContractData.creationDate}</p>
                  </div>

                  <div className="flex items-center px-2 md:px-8">
                        <p className="text-gray-600 dark:text-gray-300 text-sm break-words transition-all duration-500">
                              Wallet address: <WalletAdrressClaim walletAddress={mockContractData.creatorAddress} />
                        </p>
                  </div>

                  <CustomDivider mt={2} mb={2} />

                  <div className="mb-8 px-2 md:px-8 flex flex-col">
                        <h3 className="text-lg font-semibold">All signers</h3>
                        <div className="flex flex-col space-y-3 mt-2">
                              {mockContractData.signers.map((signer, index) => {
                                    return (
                                          <div
                                                key={index}
                                                className={cn(
                                                      'flex justify-between items-center p-3 rounded-md border gap-4',
                                                      signer.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                                                )}
                                          >
                                                <div className="flex items-center">
                                                      {signer.status === 'pending' ? <FiAlertCircle className="text-yellow-500 mr-2" /> : <FiCheckCircle className="text-green-500 mr-2" />}
                                                      <p className="text-black/90 font-mono text-sm break-all">
                                                            <WalletAdrressClaim walletAddress={signer.address} />
                                                      </p>
                                                </div>
                                                <p className={cn('text-xs font-medium', signer.status === 'pending' ? 'text-yellow-600' : 'text-green-600')}>
                                                      {signer.status === 'pending' ? 'Pending' : 'Signed'}
                                                </p>
                                          </div>
                                    )
                              })}
                        </div>
                  </div>

                  <CustomDivider mt={2} mb={2} />

                  <div className="px-[20px] md:px-8 flex flex-col gap-2">
                        <h3 className="text-lg font-semibold">Workflow activity timeline</h3>
                        <div>
                              <div className="w-full flex flex-col gap-5 py-6">
                                    {mockContractData.activities.map((activity, index) => {
                                          const info = getInformation(activity.type as any)
                                          return (
                                                <div key={`activity_item_${index}`} className="relative last:pb-0">
                                                      {/* Timeline connector */}
                                                      <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-200"></div>

                                                      {/* Timeline indicator */}
                                                      <div
                                                            className={cn(
                                                                  'absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center',
                                                                  info.color === 'blue'
                                                                        ? 'bg-blue-100 text-blue-600'
                                                                        : info.color === 'green'
                                                                          ? 'bg-green-100 text-green-600'
                                                                          : 'bg-gray-100 text-gray-600'
                                                            )}
                                                      >
                                                            <info.icon className="h-3 w-3" />
                                                      </div>

                                                      {/* Timeline content */}
                                                      <div className="ml-4">
                                                            <h4 className="font-medium">{info.title}</h4>

                                                            {activity.type === 'signed' && (
                                                                  <p className="opacity-80 text-sm break-all">
                                                                        User with address{' '}
                                                                        <span className="font-semibold font-mono">
                                                                              <WalletAdrressClaim walletAddress={activity.address ?? ''} />
                                                                        </span>{' '}
                                                                        signed the document at <span className="font-semibold">{formatDateTime(activity.timestamp)}</span>
                                                                  </p>
                                                            )}

                                                            {activity.type === 'created' && (
                                                                  <Card className="bg-gray-50/50 border-gray-100 mt-2 shadow-none">
                                                                        <CardContent className="px-2 py-0">
                                                                              <p className="opacity-90 text-sm text-black/90 break-all">
                                                                                    User with address{' '}
                                                                                    <span className="font-semibold font-mono">
                                                                                          <WalletAdrressClaim walletAddress={activity.address ?? ''} />
                                                                                    </span>{' '}
                                                                                    Created the contract workflow at <span className="font-semibold">{formatDateTime(activity.timestamp)}</span>
                                                                              </p>
                                                                              <p className="opacity-90 text-sm text-black/90">{activity.details}</p>
                                                                        </CardContent>
                                                                  </Card>
                                                            )}

                                                            {activity.type === 'completed' && (
                                                                  <Card className="bg-green-50 border-green-200 mt-4">
                                                                        <CardContent className="px-3 py-0">
                                                                              <p className="opacity-90 text-sm text-black/90">
                                                                                    <FiCheck className="inline text-green-600 mr-1" />
                                                                                    Workflow completed and validated
                                                                              </p>
                                                                              <p className="opacity-90 text-sm text-black/90">{activity.details}</p>
                                                                        </CardContent>
                                                                  </Card>
                                                            )}
                                                      </div>
                                                </div>
                                          )
                                    })}
                              </div>
                        </div>
                  </div>

                  <div>
                        <CustomDivider mt={2} mb={0} />

                        <div className={cn('pt-8 pb-8 dark:bg-black/80', getBgColorBasedOnVerificationStatus())}>
                              <div className="px-2 md:px-8 flex justify-between items-center">
                                    {mockContractData.status === 'completed' && (
                                          <div className="flex items-center">
                                                <BsCheckCircleFill className="text-green-500 mr-2" />
                                                <p>All signatures have been collected</p>
                                          </div>
                                    )}
                                    {mockContractData.status === 'pending' && <p className="text-sm opacity-90">{mockContractData?.footerMsg}</p>}
                                    <Button
                                          data-testid="action-view-contract-button"
                                          className={cn(
                                                'rounded-sm cursor-pointer',
                                                mockContractData?.status === 'pending' ? 'bg-blue-600/80 text-white hover:bg-blue-700' : 'bg-black/80 text-white hover:bg-black/70'
                                          )}
                                          onClick={goToSecondPage}
                                    >
                                          <FiFileText className="mr-2 h-4 w-4" />
                                          View Contract Informatioon
                                    </Button>
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default ContractSummaryDetails
