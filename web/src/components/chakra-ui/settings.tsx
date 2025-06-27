import { Box, Card, Container, createListCollection, Group, HStack, IconButton, Input, Text, VStack } from "@chakra-ui/react"
import { LuSettings } from "react-icons/lu"
import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle, DialogTrigger } from "./dialog"
import { Field } from "./field"
import { useState } from "react"
import { RadioCardItem, RadioCardRoot } from "./radio-card"
import { ColorModeButton, useColorMode } from "./color-mode"
import axios from "axios"
import { useStore } from "zustand"
import appStore from "../../store"
import { toaster } from "./toaster"
import { Button } from "./button"
import { IDialogSettings } from "../../types/index"
import { useNavigate } from "react-router-dom"
// import { useNavigate } from "react-router-dom"

const networks = createListCollection({
    items: [
        { label: "Mainnet", value: "mainnet" },
        { label: "Sepolia", value: "sepolia" },
        { label: "Holesky", value: "holesky" },
    ],
})




const Settings = ({ inline, open, updateOpenStatus }: IDialogSettings) => {

    const { setUserProfile, user_profile, backend_url, metamaskAddress, session } = useStore(appStore)
    const { colorMode } = useColorMode()
    const [activeNetwork, setActiveNetwork] = useState<string>(user_profile.witness_network)
    const [cliPubKey, _setCliPubKey] = useState<string>(user_profile.cli_pub_key)
    const [cliPrivKey, _setCliPrivKey] = useState<string>(user_profile.cli_priv_key)
    const [ensName, setEnsName] = useState<string>(user_profile.ens_name)
    const [contract, setContract] = useState<string>(user_profile.witness_contract_address ?? "0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611")
    const [alchemyKey, setAlchemyKey] = useState<string>(user_profile.alchemy_key ?? "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ")


    const DeleteUserData = () => {
        const [deleting, setDeleting] = useState(false)
        const { setUserProfile, setFiles, setSession, setMetamaskAddress, setAvatar, backend_url, session } = useStore(appStore)


        let navigate = useNavigate()
        const deleteUserData = async () => {
            try {
                if (!session?.nonce) {
                    toaster.create({
                        description: "You must be logged in to clear user data",
                        type: "error"
                    })
                    return
                }

                setDeleting(true)
                const url = `${backend_url}/user_data`;
                const response = await axios.delete(url, {
                    headers: {
                        'nonce': session.nonce
                    }
                });

                if (response.status === 200) {
                    // Clear local state
                    setUserProfile({
                        user_pub_key: "",
                        cli_pub_key: "",
                        cli_priv_key: "",
                        witness_network: "",
                        alchemy_key: "",
                        theme: "light",
                        ens_name: "",
                        witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                    })
                    setFiles([])
                    setSession(null)
                    setMetamaskAddress(null)
                    setAvatar(undefined)

                    // Remove cookie
                    document.cookie = "pkc_nonce=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

                    toaster.create({
                        description: "User data cleared successfully. You have been logged out.",
                        type: "success"
                    })

                    updateOpenStatus?.(false)

                    if (window.location.pathname == "/") {
                        window.location.reload();
                    } else {
                        navigate("/")
                    }
                }

                setDeleting(false)
            }
            catch (e: any) {
                toaster.create({
                    description: `Failed to clear user data: ${e instanceof Error ? e.message : String(e)}`,
                    type: "error"
                })
                setDeleting(false)
            }
        }

        return (
            <Button data-testid="delete-user-data-button"  loading={deleting} colorPalette={'red'} borderRadius={'md'} variant={'outline'} onClick={deleteUserData}>Clear Account Data</Button>
        )
    }


    const updateUserProfile = async () => {
        // const formData = new URLSearchParams();
        // formData.append('cli_priv_key', cliPrivKey);
        // formData.append('cli_pub_key', cliPubKey);
        // formData.append('witness_contract_address', contract);
        // formData.append('witness_network', activeNetwork);
        // formData.append("user_pub_key", metamaskAddress ?? user_profile.user_pub_key)
        // formData.append('theme', colorMode ?? "light");


        const url = `${backend_url}/explorer_update_user_settings`;

        const response = await axios.post(url, {
            'ens_name': ensName,
            'cli_priv_key': cliPrivKey,
            'cli_pub_key': cliPubKey,
            'witness_contract_address': contract,
            'alchemy_key': alchemyKey,
            'witness_network': activeNetwork,
            'user_pub_key': metamaskAddress ?? user_profile.user_pub_key,
            'theme': colorMode ?? "light",
        }, {
            headers: {
                'metamask_address': metamaskAddress ?? user_profile.user_pub_key,
                'nonce': session?.nonce
                // 'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            setUserProfile({
                user_pub_key: user_profile.user_pub_key,
                cli_pub_key: cliPubKey,
                ens_name: ensName,
                cli_priv_key: cliPrivKey,
                witness_network: activeNetwork,
                alchemy_key: alchemyKey,
                theme: colorMode ?? "light",
                witness_contract_address: contract ?? '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',

            })

            toaster.create({
                description: "Settings saved successfully",
                type: "success",
            })

        }
    }


    const SettingsForm = () => {

        return (
            <VStack alignItems={'start'} gapY={'6'}>
                <Card.Root w={'100%'} shadow={'sm'} borderRadius={'SM'}>
                    <Card.Body p={'4px'} px={'20px'}>
                        <Group justifyContent={'space-between'} w="100%">
                            <Text>Themes</Text>
                            <ColorModeButton />
                        </Group>
                    </Card.Body>
                </Card.Root>
                <Field invalid={false} label="Alias Name" errorText="This field is required" >
                    <Input placeholder="Alias" value={ensName} onChange={e => setEnsName(e.currentTarget.value)} />
                </Field>

                {/* <Divider my={4} borderColor="gray.300" /> */}

                {/* Custom Divider */}
                <Box
                    width="100%"
                    height="1px"
                    bg="gray.200"
                    my={2}
                />
                <Text fontSize={'lg'}>Etherium Settings</Text>


                <Container
                    p={0}
                    alignItems="start"
                    fluid >

                    <Field invalid={false} label="Public address" helperText="self-issued identity claim used for generating/verifying aqua chain" errorText="This field is required">
                        <Input placeholder="User Public address" disabled={true} value={user_profile.user_pub_key} autoComplete="off" />
                    </Field>
                    {/* <Field invalid={false} label="CLI public key " helperText="self-issued identity claim used for generating/verifying aqua chain" errorText="This field is required">
                    <Input placeholder="XXXXXXX" value={cliPubKey} type="text" onChange={e => setCliPubKey(e.currentTarget.value)} autoComplete="off" />
                </Field> */}
                    {/* <Field invalid={false} label="CLI private key " helperText="self-issued identity claim used for generating/verifying aqua chain" errorText="This field is required">
                    <Input placeholder="XXXXXXXXX" value={cliPrivKey} type={"password"} onChange={e => setCliPrivKey(e.currentTarget.value)} autoComplete="off" />
                </Field> */}
                    <Field invalid={false} label="Alchemy Key" errorText="This field is required" >
                        <Input placeholder="Alchemy Key" value={alchemyKey} onChange={e => setAlchemyKey(e.currentTarget.value)} />
                    </Field>
                    <Field invalid={false} label="Contract Address" errorText="This field is required" >
                        <Input placeholder="Contract Address" value={contract} disabled={true} onChange={e => setContract(e.currentTarget.value)} />
                    </Field>
                    <Field invalid={false} label={"Select Network " + activeNetwork} errorText="This field is required" >
                        <RadioCardRoot value={activeNetwork} onValueChange={e => setActiveNetwork(`${e.value}`)}>
                            <HStack align="stretch">
                                {networks.items.map((item) => (
                                    <RadioCardItem
                                        borderRadius={'xl'}
                                        label={item.label}
                                        key={item.value}
                                        value={item.value}
                                    />
                                ))}
                            </HStack>
                        </RadioCardRoot>
                    </Field>

                </Container>
                
            </VStack>
        )
    }

    return (
        <>
            <DialogRoot size={{ md: 'md', smDown: 'full' }} placement={'top'} open={open}
            // onOpenChange={(e) => updateOpenStatus?.(e.open)}
            >
                <DialogTrigger asChild>
                    <IconButton
                        onClick={() => updateOpenStatus?.(true)}
                        variant="ghost"
                        aria-label="Toggle color mode"
                        size="sm"
                        hidden={inline}
                        css={{
                            _icon: {
                                width: "5",
                                height: "5",
                            },
                        }}
                    >
                        <LuSettings />
                    </IconButton>
                </DialogTrigger>
                <DialogContent borderRadius={{ base: 0, md: 'xl' }}>
                    <DialogHeader py={"3"} px={"5"}>
                        <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <DialogBody >
                        {SettingsForm()}
                    </DialogBody>
                    <DialogFooter>
                        <HStack w={'100%'} justifyContent={'space-between'}>
                            <VStack alignItems={'flex-start'} gap={2}>
                                {DeleteUserData()}
                            </VStack>
                           
                            <HStack>
                                <Button data-testid="settings-save-button" variant="solid" bg={'green'} onClick={updateUserProfile}>Save</Button>
                                <DialogActionTrigger asChild>
                                    <Button data-testid="settings-cancel-button" variant="outline" onClick={() => updateOpenStatus?.(false)}>Cancel</Button>
                                </DialogActionTrigger>
                            </HStack>
                        </HStack>
                    </DialogFooter>
                    <DialogCloseTrigger onClick={() => updateOpenStatus?.(false)} />
                </DialogContent>
            </DialogRoot>
        </>
    )
}

export default Settings