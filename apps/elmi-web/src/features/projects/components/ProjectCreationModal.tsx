import { ButtonProps, Form, Modal, Segmented, Select } from "antd"
import * as yup from 'yup'
import { AgeGroup, BodyLanguage, ClassifierLevel, DEFAULT_PROJECT_CONFIG, EmotionalLevel, LanguageProficiency, MainAudience, ProjectConfiguration, SigningSpeed, SignLanguageType } from "../../../model-types";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "../../../redux/hooks";
import { createProject, fetchSongs, songEntitySelectors } from "../reducer";
import { FormItem } from "react-hook-form-antd";
import { LoadingIndicator } from "../../../components/LoadingIndicator";
import { DefaultOptionType } from "antd/es/select";
import * as changeCase from "change-case";
import { config } from "process";
import { useNavigate } from "react-router-dom";

const projectConfigurationSchema = yup.object<ProjectConfiguration & {songId: string}>().shape({
    songId: yup.string().trim().required(),
    main_audience: yup.mixed<MainAudience>().oneOf(Object.values(MainAudience)).default(MainAudience.Deaf),
    age_group: yup.mixed<AgeGroup>().oneOf(Object.values(AgeGroup)).default(AgeGroup.Adult),
    main_language: yup.mixed<SignLanguageType>().oneOf(Object.values(SignLanguageType)).default(SignLanguageType.ASL),
    language_proficiency: yup.mixed<LanguageProficiency>().oneOf(Object.values(LanguageProficiency)).default(LanguageProficiency.Moderate),
    signing_speed: yup.mixed<SigningSpeed>().oneOf(Object.values(SigningSpeed)).default(SigningSpeed.Moderate),
    emotional_level: yup.mixed<EmotionalLevel>().oneOf(Object.values(EmotionalLevel)).default(EmotionalLevel.Moderate),
    body_language: yup.mixed<BodyLanguage>().oneOf(Object.values(BodyLanguage)).default(BodyLanguage.Moderate),
    classifier_level: yup.mixed<ClassifierLevel>().oneOf(Object.values(ClassifierLevel)).default(ClassifierLevel.Moderate),
});

const CONFIG_OPTS: {[key: string]: Array<string>} = {
    main_audience: Object.values(MainAudience),
    age_group: Object.values(AgeGroup),
    main_language: Object.values(SignLanguageType),
    language_proficiency: Object.values(LanguageProficiency),
    signing_speed: Object.values(SigningSpeed),
    emotional_level: Object.values(EmotionalLevel),
    body_language: Object.values(BodyLanguage),
    classifier_level: Object.values(ClassifierLevel)
}

export const ProjectCreationModal = (props: {
    isOpen: boolean,
    onClose: () => void
}) => {

    const dispatch = useDispatch()

    const fetchingSongs = useSelector(state => state.projects.fetchingSongs)
    const creatingProject = useSelector(state => state.projects.creatingProject)
    const songs = useSelector(songEntitySelectors.selectAll)

    const { control, handleSubmit, setValue } = useForm({
        resolver: yupResolver(projectConfigurationSchema),
        reValidateMode: 'onChange',
        defaultValues: {songId: undefined, ...DEFAULT_PROJECT_CONFIG}
    })

    const songSelectOptions: Array<DefaultOptionType> = useMemo(()=>{
        return  songs.map(song => ({value: song.id, label: <span><b>{song.title}</b> - {song.artist}</span>}))
    }, [fetchingSongs, songs])


    const nav = useNavigate()

    const onCreateProject = useCallback((values: ProjectConfiguration & {songId: string}) => {
        console.log(values)
        dispatch(createProject(values.songId, values, (projectId: string) => {
            props.onClose()
            nav(`/app/projects/${projectId}`)
        }))
    }, [nav, props.onClose]) 

    useEffect(()=>{
        if(songs.length > 0){
            setValue('songId', songs[0].id, {shouldDirty: false})
        }
    }, [songs])

    const okButtonProps: ButtonProps = useMemo(()=>{
        return {"htmlType": "submit", form: "new-project-form", disabled: fetchingSongs}
    }, [fetchingSongs])

    const cancelButtonProps: ButtonProps | undefined = useMemo<ButtonProps|undefined>(() => {
        return (fetchingSongs === true || creatingProject === true) ? {hidden: true, disabled: true} : undefined
    }, [fetchingSongs, creatingProject])

    return <Modal title="Add New Project"
        open={props.isOpen}
        confirmLoading={creatingProject}
        maskClosable={false}
        closable={!creatingProject}
        destroyOnClose onClose={props.onClose} onCancel={props.onClose} okText="Create" okButtonProps={okButtonProps} cancelButtonProps={cancelButtonProps}>
        {
            fetchingSongs === true || creatingProject === true ? <LoadingIndicator title={creatingProject ? "Creating project..." : "Fetching song list..."}/> : <>
            <hr className="mb-4"/>
                <Form id="new-project-form" onFinish={handleSubmit(onCreateProject)} preserve={false}>
                    <FormItem control={control} name={"songId"} label={<span className="font-semibold">Song</span>} labelAlign="left" labelCol={{span:8}}>
                        <Select options={songSelectOptions} defaultActiveFirstOption={true}/>
                    </FormItem>

                    {
                        Object.keys(CONFIG_OPTS).map(config_key => <FormItem key={config_key} control={control} name={config_key as any} 
                            label={<span className="font-semibold">{changeCase.sentenceCase(config_key)}</span>}>
                        <Segmented options={CONFIG_OPTS[config_key]}/>
                    </FormItem>)
                    }
                    
                </Form>
            <hr/>
        </>
        }
    </Modal>
}