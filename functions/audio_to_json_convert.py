from __future__ import print_function
import os
import urllib
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

transcribe = boto3.client('transcribe')

audio_bucket = os.environ['AUDIO_BUCKET']
json_bucket = os.environ['JSON_BUCKET']

job_uri_base = "https://" + audio_bucket + ".s3.amazonaws.com/"
s3_path_prcs_lambda = "s3://" + json_bucket

job_name = " "

def lambda_handler(event, context):
    logger.info('Event: {}'.format(event))

    bucketName = event['Records'][0]['s3']['bucket']['name']
    objectName = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
    objectSize = event['Records'][0]['s3']['object']['size']
    eventTime = urllib.parse.unquote_plus(event['Records'][0]['eventTime'])
    user_id = objectName.split('/')[0]

    logger.info('Object Info: (1) Object Name: {}, (2) Object Size: {}, (3) Event Time: {}'.format(objectName, objectSize, eventTime))

    job_name = "TransVoice-" + objectName.split('/')[1].split('.')[0]
    job_uri = job_uri_base + objectName

    logger.info('Transcribe job name: {}'.format(job_name))
    logger.info('Transcribe job uri: {}'.format(job_uri))

    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={
            'MediaFileUri': job_uri
        },
        MediaFormat='wav',
        LanguageCode='en-US',
        OutputBucketName=json_bucket,
        OutputKey=user_id + '/',
        Settings={
            'ShowSpeakerLabels': True,
            'MaxSpeakerLabels': 10,
            'ChannelIdentification': False
        }
    )

    return

