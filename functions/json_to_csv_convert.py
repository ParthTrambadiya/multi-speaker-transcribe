from __future__ import print_function
import os
import urllib
import boto3
import datetime
import json
import csv

import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

json_bucket = os.environ['JSON_BUCKET']
csv_bucket = os.environ['CSV_BUCKET']

s3_path_prcs_lambda = "s3://" + csv_bucket

def parse_transcribe_ouput(Transcribe_jsondata):
    rawjsondata = Transcribe_jsondata
    data_result = {"time": [], "speaker_tag": [], "comment": []}

    # Identifying speaker populating speakers into an array
    if "speaker_labels" in rawjsondata["results"].keys():

        logger.info('SPEAKER IDENTIFICATION PARA')

        # processing segment for building array for speaker and time duration for building csv file
        for segment in rawjsondata["results"]["speaker_labels"]["segments"]:

            # if items
            if len(segment["items"]) > 0:

                data_result["time"].append(time_conversion(segment["start_time"]))
                #timesm = time_conversion(segment["start_time"])

                data_result["speaker_tag"].append(segment["speaker_label"])

                data_result["comment"].append("")

                # looping thru each word
                for word in segment["items"]:

                    pronunciations = list(
                        filter(
                            lambda x: x["type"] == "pronunciation",
                            rawjsondata["results"]["items"],
                        )
                    )

                    word_result = list(
                        filter(
                            lambda x: x["start_time"] == word["start_time"]
                                      and x["end_time"] == word["end_time"],
                            pronunciations,
                        )
                    )

                    result = sorted(
                        word_result[-1]["alternatives"], key=lambda x: x["confidence"]
                    )[-1]

                    # for the word!
                    data_result["comment"][-1] += " " + result["content"]

                    # Check for punctuation !!!!
                    try:
                        word_result_index = rawjsondata["results"]["items"].index(
                            word_result[0]
                        )
                        next_item = rawjsondata["results"]["items"][word_result_index + 1]
                        if next_item["type"] == "punctuation":
                            data_result["comment"][-1] += next_item["alternatives"][0][
                                "content"

                            ]

                    except IndexError:

                        pass


    # Invalid File exiting!
    else:
        logger.info("Need to have speaker identification, Please check the file USE WAV format Audio file for better results")
        return

    return data_result

def time_conversion(timeX):
    times = datetime.timedelta(seconds=float(timeX))
    times = times - datetime.timedelta(microseconds=times.microseconds)
    return str(times)

def lambda_handler(event, context):
    bucketName = event['Records'][0]['s3']['bucket']['name']
    objectName = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
    objectSize = event['Records'][0]['s3']['object']['size']
    eventTime = urllib.parse.unquote_plus(event['Records'][0]['eventTime'])

    logger.info('Object Info: (1) Object Name: {}, (2) Object Size: {}, (3) Event Time: {}'.format(objectName, objectSize, eventTime))
    
    text = s3.get_object(Bucket=json_bucket, Key=objectName)['Body']
    s3objectdata = text.read().decode()
    transcribe_json_data = json.loads(s3objectdata)
    
    csv_elements = parse_transcribe_ouput(transcribe_json_data)

    sentence = []
    speaker_tag = []
    timedur = []
    
    sentence = csv_elements["comment"]
    speaker_tag = csv_elements["speaker_tag"]
    timedur = csv_elements["time"]
    
    file = objectName.split('.')[0]
    
    fileName = str(file) + '.csv'
    
    with open('/tmp/' + fileName.split('/')[1], 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Time", "Speaker", "Sentence"])
        
        for x in range(len(speaker_tag)):
            writer.writerow([timedur[x], speaker_tag[x], sentence[x]])
    
    s3.upload_file('/tmp/' + fileName.split('/')[1], csv_bucket, fileName)
    
    return {
        'message': 'success!!'
    }
    
    
