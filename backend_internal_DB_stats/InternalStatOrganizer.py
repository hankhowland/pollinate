import pymongo
import pandas
from datetime import datetime

client = pymongo.MongoClient('mongodb+srv://hankhowland:jojo3302@lists.9qsfv.mongodb.net/pollinate?retryWrites=true&w=majority')
db = client.pollinate
MeetingCollection = db.HistoricalMeetings
print(client.list_database_names())  # output: ['admin', 'local']
print(db.list_collection_names())  # output: []
user = {'name': 'Halil', 'lang': 'Python'}
insert_user = MeetingCollection.insert_one(user)
print(insert_user.inserted_id)
post = {'user': 'halilylm', 'title': 'First post', 'content': 'I love Python',
        'post_date': datetime.now()}
insert_post = MeetingCollection.insert_one(post)
print(insert_post.inserted_id)
#pick up from the "https://towardsdatascience.com/using-mongodb-with-python-bcb26bf25d5d" at updating one document
query = {'content': 'I love Python'}
print(MeetingCollection.find_one(query))
# output: {'_id': ObjectId('5ed12a90a2ea2942ec2a23d7'),
# 'user': 'halilylm', 'title': 'Second', 'content': 'I love MongoDB'}

new_document = {'$set': {'content': 'I love MongoDB and Python', 'title': 'Updated Post'}}
update_post = MeetingCollection.update_one(query, new_document, upsert=False)
#print(update_post.matched_count)  # output: 1

updated_document = MeetingCollection.find_one({'title': 'Updated Post'})
#print(updated_document)
#for post in MeetingCollection.find({'user': 'halilylm'}):
    #print(post)
df = pandas.DataFrame(list(MeetingCollection.find({'title': 'Updated Post'})))
print(df)
#In collections list there is the meetings collection which has all historical meetings
#need user ids 
#plan:
#page for organization admin:
## have name search bars
###that executes search and runs python script to either render individual stats or rankings of the org
###The individual stats: study buddy productivity rankings 2 week, and 1 month, 3 months:
#onclick confirmation
def IndividualEmployeeStatsfunction(FirstName, LastName):
        UserCollection = db.users
        query = {'FirstName': FirstName,'LastName':LastName}
        userInfo=UserCollection.find_one(query)
        Email=userInfo['email']
        print(Email)
        MeetingCollection = db.meetings
        AsMotDF = pandas.DataFrame(list(MeetingCollection.find({'motivatorEmail': Email})))
        AsStudDF = pandas.DataFrame(list(MeetingCollection.find({'studierEmail': Email})))
        IndivEmployeeDF= pandas.concat([AsMotDF, AsStudDF])
        print(IndivEmployeeDF)
        #Return JSON file with stats
        return 
IndividualEmployeeStatsfunction('Jack', 'Ogle')
#render the db from historical meetings
#myProgress Page:

###New thing:
MeetingCollection = db.meetings
df = pandas.DataFrame(list(MeetingCollection.find({})))
print(df)
df=df[df['date']>=20210401]
print(df)
print(df['motivatorEmail'].unique())
print(df['studierEmail'].unique())
mot=['paschal@uchicago.edu', 'mkaur1@uchicago.edu', 'hkohli@uchicago.edu',
 'sliu320@uchicago.edu', 'sieh@uchicago.edu', 'tdonohoe@uchicago.edu',
 'adedayo@uchicago.edu' ,'tweil@uchicago.edu', 'jnbowen@uchicago.edu',
 'jhsivadas@live.com', 'rithvikkoppurapu@gmail.com',
 'bella.chen88@gmail.com' ,'jerez@uchicago.edu' ,'hankhowland@gmail.com',
 'jackogle@uchicago.edu', 'apullabhotla@uchicago.edu',
 'maggiegjliu@uchicago.edu', 'ejanssen@uchicago.edu',
 'estherkim13@uchicago.edu' ,'cwzhang@uchicago.edu', 'aharve@uchicago.edu',
 'qianam@uchicago.edu' ,'graceannwang@uchicago.edu', 'jrmerril@uchicago.edu',
 'test5@gmail.com', 'jweisskopf@uchicago.edu']
print(len(mot))
stud=['klingl@uchicago.edu' ,'mmeneses@uchicago.edu' ,'jasminskie@uchicago.edu',
 'creddy@uchicago.edu' ,'akmody@uchicago.edu', 'zacharyr41@gmail.com',
 'sarthakk@uchicago.edu' ,'erosaslinhard@uchicago.edu',
 'mwieseltier@uchicago.edu' ,'jerez@uchicago.edu', 'jmalasek@uchicago.edu'
 'eharper1@uchicago.edu' ,'shivam1@gmail.com', 'apnorton@uchicago.edu',
 'jhsivadas@live.com', 'jackogle@uchicago.edu' ,'hankhowland17@gmail.com',
 'hankhowland19@gmail.com', 'aemiranda@uchicago.edu',
 'honipein@uchicago.edu', 'yij@uchicago.edu', 'agrogan@uchicago.edu',
 'alexanderprakash@uchicago.edu' ,'spencerscott@uchicago.edu',
 'malachim@uchicago.edu', 'muchovak@uchicago.edu' ,'hankhowland@gmail.com',
 'jweisskopf@uchicago.edu', 'jrmerril@uchicago.edu']
print(len(stud))
list1=stud+mot
for i in list1:
        if list1.count(i)>1:
                list1.remove(i)
        else:
                pass
print(len(list1))
print(list1)