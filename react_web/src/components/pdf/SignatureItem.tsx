import { SignatureData } from '../../types/types'
import WalletAddressClaim from '../../pages/v2_claims_workflow/WalletAdrressClaim'
import { ensureDomainUrlHasSSL } from '@/utils/functions'

interface ISignatureItem {
      signature: SignatureData
}

const SignatureItem: React.FC<ISignatureItem> = ({ signature }) => {
      
      return (
            <div>
                  <div key={signature.id} className="p-2 cursor-pointer bg-blue-50 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-row items-center space-x-3">
                              <div className="w-[60px] h-[40px] bg-no-repeat bg-center bg-contain border border-gray-200 rounded-sm" style={{ backgroundImage: `url(${ensureDomainUrlHasSSL(signature.dataUrl)})` }} />
                              <div className="flex flex-col space-y-0">
                                    <p className="text-sm font-medium">{signature.name}</p>
                                    <p className="text-xs text-gray-600">
                                          {/* {signature.walletAddress.length > 10
                                                ? `${signature.walletAddress.substring(0, 6)}...${signature.walletAddress.substring(signature.walletAddress.length - 4)}`
                                                : signature.walletAddress} */}
                                                <WalletAddressClaim walletAddress={signature.walletAddress} />
                                    </p>
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default SignatureItem
